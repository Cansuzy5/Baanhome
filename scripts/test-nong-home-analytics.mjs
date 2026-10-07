import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';

const output = mkdtempSync(resolve('.analytics-test-'));
const bundle = async (entry, name, plugins = []) => {
  const file = join(output, name + '.mjs');
  await build({ entryPoints: [entry], outfile: file, bundle: true, platform: 'node', format: 'esm', plugins });
  return import(pathToFileURL(file).href);
};
try {
  const model = await bundle('src/utils/nongHomeAnalyticsModel.ts', 'model');
  const crypto = await bundle('lib/nongHomeAnalytics.ts', 'crypto');
  const timestamp = '2026-10-07T01:00:00.000Z';
  const event = { id: `${Date.parse(timestamp)}-${randomUUID()}`, timestamp, staffId: 'u1', staffName: 'ชื่อซ้ำ', department: 'FO', question: '  เช็กอิน   กี่โมง ', found: true, resultCount: 2 };
  const missing = { ...event, id: `${Date.parse(timestamp)}-${randomUUID()}`, staffId: 'u2', question: 'ไม่พบข้อมูล', found: false, resultCount: 0 };
  const summary = model.summarizeSearches([event, event, missing]);
  assert.equal(summary.total, 2); assert.equal(summary.activeUsers, 2);
  assert.equal(summary.coverage, 50); assert.equal(summary.gap, 50);
  assert.equal(model.summarizeSearches([]).coverage, null);
  assert.equal(model.normalizeQuestion('  CHECK   IN '), 'check in');
  assert.equal(model.bangkokDate('2026-10-06T17:00:00Z'), '2026-10-07');
  const range = crypto.analyticsRange('2026-10-07', '2026-10-07');
  assert.equal(range.start, Date.parse('2026-10-06T17:00:00Z')); assert.equal(range.end - range.start, 86400000);
  assert.throws(() => crypto.analyticsRange('2026-10-08', '2026-10-07'));
  assert.throws(() => crypto.analyticsRange('2026-02-31', '2026-03-05'));
  assert.throws(() => crypto.analyticsKey(''));
  const key = crypto.analyticsKey('ab'.repeat(32));
  const encrypted = crypto.encryptAnalytics(event, key);
  assert.equal(JSON.stringify(encrypted).includes(event.question), false);
  assert.deepEqual(crypto.decryptAnalytics(event.id, encrypted, key), event);
  assert.throws(() => crypto.decryptAnalytics(missing.id, encrypted, key));
  assert.throws(() => crypto.decryptAnalytics(event.id, encrypted, crypto.analyticsKey('cd'.repeat(32))));
  assert.deepEqual(crypto.validateAnalyticsEvent(event, Date.parse(timestamp)), event);
  assert.throws(() => crypto.validateAnalyticsEvent({ ...event, found: false }, Date.parse(timestamp)));
  assert.throws(() => crypto.validateAnalyticsEvent(event, Date.parse(timestamp) + 300001));
  console.log('PASS counts, deduplication, real staff IDs, empty data, Bangkok boundaries, encryption, tampering and validation');

  // Isolated backend fake. No connection to production Firestore.
  globalThis.analyticsFake = { records: new Map(), writes: 0, reads: 0 };
  const dbPlugin = { name: 'fake-db', setup(builder) {
    builder.onResolve({ filter: /firebase\/firestore$/ }, () => ({ path: 'firestore', namespace: 'fake' }));
    builder.onResolve({ filter: /\/_db\.js$/ }, () => ({ path: 'db', namespace: 'fake' }));
    builder.onLoad({ filter: /.*/, namespace: 'fake' }, args => ({ contents: args.path === 'db' ? 'export const getOperationalDb = () => ({});' : `
      const f = globalThis.analyticsFake;
      export const doc = (db, collection, id) => ({ collection, id });
      const snap = ref => ({ exists: () => f.records.has(ref.id), data: () => f.records.get(ref.id) });
      export const getDocFromServer = async ref => { f.reads++; return snap(ref); };
      export const runTransaction = async (db, fn) => fn({ get: async ref => snap(ref), set: (ref, value) => { f.records.set(ref.id, value); f.writes++; } });
      export const collection = (db, name) => name;
      export const documentId = () => 'id';
      export const where = (...args) => args;
      export const orderBy = (...args) => args;
      export const limit = (...args) => args;
      export const startAfter = (...args) => args;
      export const query = (...args) => args;
      export const getDocsFromServer = async () => f.pages?.shift() || ({ size: 0, docs: [] });
    ` }));
  } };
  const { default: handler } = await bundle('api/nong-home-analytics.ts', 'handler', [dbPlugin]);
  const call = async body => {
    let status, data;
    const response = { setHeader() {}, status(code) { status = code; return this; }, json(value) { data = value; return this; } };
    await handler({ method: 'POST', body }, response); return { status, data };
  };
  const fake = globalThis.analyticsFake;
  const password = 'test-password';
  fake.records.set('admin', { status: 'active', role: 'Administrator', name: 'Admin', department: 'OD', passwordHash: createHash('sha256').update('BaanHome_Secure_Salt_2026_!' + password).digest('hex') });
  fake.records.set('u1', { status: 'active', role: 'Knowledge User', name: 'Central Name', department: 'Central Department', passwordHash: fake.records.get('admin').passwordHash });
  process.env.NONG_HOME_ANALYTICS_SECRET = 'ab'.repeat(32);
  assert.equal((await call({ action: 'report', authorization: { userId: 'admin', password: 'wrong' }, from: '2026-10-07', to: '2026-10-07' })).status, 403);
  assert.equal((await call({ action: 'report', authorization: { userId: 'u1', password }, from: '2026-10-07', to: '2026-10-07' })).status, 403);
  assert.equal((await call({ action: 'report', authorization: { userId: 'admin', password }, from: '2026-10-07', to: '2026-10-07' })).status, 200);
  const pageEvents = Array.from({ length: 601 }, (_, index) => ({ ...event, id: `${Date.parse(timestamp)}-${randomUUID()}`, question: `คำถาม ${index}` }));
  fake.pages = [pageEvents.slice(0, 300), pageEvents.slice(300, 600), pageEvents.slice(600)].map(rows => ({ size: rows.length, docs: rows.map(row => ({ id: crypto.EVENT_PREFIX + row.id, data: () => crypto.encryptAnalytics(row, key) })) }));
  const paged = await call({ action: 'report', authorization: { userId: 'admin', password }, from: '2026-10-07', to: '2026-10-07' });
  assert.equal(paged.status, 200); assert.equal(paged.data.events.length, 601);
  fake.pages = [{ size: 1, docs: [{ id: crypto.EVENT_PREFIX + event.id, data: () => ({ version: 9 }) }] }];
  assert.equal((await call({ action: 'report', authorization: { userId: 'admin', password }, from: '2026-10-07', to: '2026-10-07' })).status, 503);
  console.log('PASS full pagination and corrupt-data failure instead of misleading partial results');
  const now = new Date().toISOString(); const fresh = { ...event, timestamp: now, id: `${Date.parse(now)}-${randomUUID()}` };
  assert.equal((await call({ action: 'record', event: fresh })).status, 200);
  assert.equal((await call({ action: 'record', event: fresh })).status, 200);
  assert.equal(fake.writes, 2); // One event + first-use marker, repeat writes nothing.
  const saved = crypto.decryptAnalytics(fresh.id, fake.records.get(crypto.EVENT_PREFIX + fresh.id), key);
  assert.equal(saved.staffName, 'Central Name'); assert.equal(saved.department, 'Central Department');
  delete process.env.NONG_HOME_ANALYTICS_SECRET;
  assert.equal((await call({ action: 'record', event: fresh })).status, 503); assert.equal(fake.writes, 2);
  console.log('PASS admin password and role checks, idempotent writes, central staff identity, disabled config writes nothing');

  // Exercise actual observer with fake hooks and timers.
  const hookPlugin = { name: 'fake-react', setup(builder) {
    builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'fake-react' }));
    builder.onLoad({ filter: /.*/, namespace: 'fake-react' }, () => ({ contents: `export const useRef = v => globalThis.hookFake.ref(v); export const useEffect = (fn, deps) => globalThis.hookFake.effect(fn, deps);` }));
  } };
  const { useSearchAnalytics } = await bundle('src/hooks/useSearchAnalytics.ts', 'hook', [hookPlugin]);
  let refs = [], index = 0, deps, cleanup, timers = new Map(), timerId = 0, calls = [];
  globalThis.hookFake = { ref(value) { return refs[index++] ||= { current: value }; }, effect(fn, next) { if (!deps || next.some((value, i) => !Object.is(value, deps[i]))) { cleanup?.(); cleanup = fn(); deps = next; } } };
  const originalSet = globalThis.setTimeout, originalClear = globalThis.clearTimeout, originalFetch = globalThis.fetch;
  globalThis.setTimeout = (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; };
  globalThis.clearTimeout = id => timers.delete(id);
  globalThis.fetch = (...args) => { calls.push(args); return Promise.reject(new Error('Offline')); };
  const render = (text, count) => { index = 0; useSearchAnalytics(text, { id: 'u1', name: 'Staff', department: 'FO' }, () => count); };
  const flush = () => { for (const [id, timer] of [...timers]) if (timer.ms === 1500) { timers.delete(id); timer.fn(); } };
  try {
    render('เช', 2); render('เช็กอิน', 0); flush(); await Promise.resolve(); await Promise.resolve();
    assert.equal(calls.length, 1); assert.equal(JSON.parse(calls[0][1].body).event.found, false);
    render('เช็กอิน', 3); flush(); assert.equal(calls.length, 1);
    render('', 0); render('เช็กอิน', 2); flush(); assert.equal(calls.length, 2);
    render('ยกเลิก', 0); cleanup?.(); flush(); assert.equal(calls.length, 2);
  } finally { globalThis.setTimeout = originalSet; globalThis.clearTimeout = originalClear; globalThis.fetch = originalFetch; }
  console.log('PASS debounce, zero results, filter/rerender deduplication, repeated query after clear, unmount cancellation, offline failure isolation');
  const auth = readFileSync('src/utils/authService.ts', 'utf8');
  const userRoles = auth.slice(auth.indexOf('export const ROLE_PERMISSIONS'));
  assert.equal(userRoles.slice(0, userRoles.indexOf('Administrator:')).includes("'analytics'"), false);
  assert.ok(userRoles.slice(userRoles.indexOf('Administrator:')).includes("'analytics'"));
  console.log('PASS analytics tab is Administrator only');
} finally { rmSync(output, { recursive: true, force: true }); }
