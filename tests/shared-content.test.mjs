import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import assert from 'node:assert/strict';
import test from 'node:test';
const docs = new Map();
let failWrites = false;
let queue = Promise.resolve();
globalThis.testDb = {
  doc: (_db, collection, id) => `${collection}/${id}`,
  getDocFromServer: async p => ({ exists: () => docs.has(p), data: () => structuredClone(docs.get(p)) }),
  setDoc: async (p, v) => {
    if (failWrites) throw new Error('Firestore unavailable');
    assert.ok(Buffer.byteLength(JSON.stringify(v)) < 1024 * 1024);
    docs.set(p, structuredClone(v));
  },
  runTransaction: async (_db, fn) => {
    const work = queue.then(async () => {
      const writes = [];
      await fn({ get: globalThis.testDb.getDocFromServer, set: (p, v) => writes.push([p, v]) });
      for (const [p, v] of writes) await globalThis.testDb.setDoc(p, v);
    });
    queue = work.catch(() => {});
    return work;
  },
};
registerHooks({
  resolve(s, c, next) {
    if (s === 'firebase/firestore') return { url: 'mock:firestore', shortCircuit: true };
    if (s === '../api/_db.js') return { url: 'mock:db', shortCircuit: true };
    if (s.startsWith('.')) {
      let u = new URL(s, c.parentURL);
      if (u.pathname.endsWith('.js')) u = new URL(u.href.replace(/\.js$/, '.ts'));
      else if (!/\.[a-z]+$/.test(u.pathname)) u = new URL(u.href + '.ts');
      if (existsSync(u)) return { url: u.href, shortCircuit: true };
    }
    return next(s, c);
  },
  load(u, c, next) {
    if (u === 'mock:db') return { format: 'module', source: 'export const getDb=()=>({}); export const setCorsHeaders=()=>{};', shortCircuit: true };
    if (u === 'mock:firestore') return { format: 'module', source: 'export const {doc,getDocFromServer,setDoc,runTransaction}=globalThis.testDb;', shortCircuit: true };
    if (u.startsWith('file:') && u.endsWith('.ts') && !u.includes('/node_modules/')) return { format: 'module', source: transformSync(readFileSync(new URL(u), 'utf8'), { loader: 'ts', format: 'esm', target: 'es2022' }).code, shortCircuit: true };
    return next(u, c);
  },
});
const { contentHandler } = await import('../lib/sharedContentStore.ts');
const { splitContent } = await import('../lib/sharedContentProtocol.ts');
const { SharedContentClient } = await import('../src/utils/sharedContentClient.ts');
const handlers = { knowledge: contentHandler('knowledge'), images: contentHandler('customImages') };
async function call(kind, method, body, query = {}) {
  const res = { code: 200, data: null, setHeader() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; }, end() { return this; } };
  await handlers[kind]({ method, body, query }, res);
  return res;
}
globalThis.fetch = async (url, options = {}) => {
  const u = new URL(url, 'https://test.invalid');
  const r = await call(u.pathname.includes('knowledge') ? 'knowledge' : 'images', options.method || 'GET', options.body ? JSON.parse(options.body) : undefined, Object.fromEntries(u.searchParams));
  return { ok: r.code < 400, status: r.code, json: async () => r.data };
};
test('large payload, durable errors, concurrent devices, reset, legacy preservation', async () => {
  const large = { items: [{ id: 'large', detail: 'ภาษาไทย😀'.repeat(180000) }], sheetUrl: 'sheet', lastSynced: '2026-10-08' };
  assert.ok(Buffer.byteLength(JSON.stringify(large)) > 1024 * 1024);
  assert.deepEqual(JSON.parse(splitContent(large).map(p => Buffer.from(p).toString()).join('')), large);
  const a = new SharedContentClient('/api/sync/knowledge');
  await a.save('main', large);
  const b = new SharedContentClient('/api/sync/knowledge');
  assert.deepEqual((await b.read()).values.main, large);
  failWrites = true;
  await assert.rejects(a.save('main', { ...large, sheetUrl: 'failed' }), /unavailable/);
  failWrites = false;
  assert.equal((await b.read()).values.main.sheetUrl, 'sheet');
  const missing = await call('knowledge', 'POST', { action: 'commit', key: 'main', parts: ['a'.repeat(64)], expectedVersion: a.version('main') });
  assert.equal(missing.code, 503);
  assert.equal((await b.read()).values.main.sheetUrl, 'sheet');
  const stale = b.version('main');
  await a.save('main', { ...large, items: [{ id: 'new' }] });
  await assert.rejects(b.save('main', large, stale), /เครื่องอื่น/);
  assert.deepEqual((await b.read()).values.main.items, [{ id: 'new' }]);
  const ia = new SharedContentClient('/api/sync/custom-images');
  const ib = new SharedContentClient('/api/sync/custom-images');
  await Promise.all([ia.read(), ib.read()]);
  const image = 'data:image/png;base64,' + 'A'.repeat(6 * 1024 * 1024);
  await Promise.all([ia.save('A', [image]), ib.save('B', ['https://example.com/b.png'])]);
  const data = (await ia.read()).values;
  assert.equal(data.A[0], image);
  assert.equal(data.B[0], 'https://example.com/b.png');
  await ia.save('A', null);
  assert.equal((await ib.read()).values.A, null);
  await ia.save('A', []);
  assert.deepEqual((await ib.read()).values.A, []);
  assert.equal((await call('images', 'POST', { images: {} })).code, 409);
  docs.set('systemConfig/knowledge', { payload: { items: [{ id: 'legacy' }] } });
  assert.equal((await b.read()).legacy.items[0].id, 'legacy');
  await a.save('main', { items: null, sheetUrl: '', lastSynced: null });
  assert.equal((await b.read()).values.main.items, null);
  assert.equal(docs.get('systemConfig/knowledge').payload.items[0].id, 'legacy');

  // Exercise the actual browser utilities: quota errors must not lose a confirmed save.
  const cache = new Map();
  let quotaFull = false;
  globalThis.localStorage = {
    getItem: key => cache.get(key) || null,
    setItem: (key, value) => { if (quotaFull) throw new Error('QuotaExceededError'); cache.set(key, value); },
    removeItem: key => cache.delete(key),
  };
  const timers = new Map();
  globalThis.window = new EventTarget();
  window.setInterval = fn => { timers.set(timers.size + 1, fn); return timers.size; };
  globalThis.clearInterval = id => timers.delete(id);
  globalThis.document = new EventTarget();
  document.hidden = false;
  const originalImageKey = 'baan_home_custom_item_images_v1';
  cache.set(originalImageKey, JSON.stringify({ localOnly: ['https://example.com/local.png'] }));
  const images = await import('../src/utils/itemImageManager.ts');
  const item = { id: 'localOnly', category: 'restaurant' };
  quotaFull = true;
  await images.saveItemImages(item.id, [image]);
  assert.deepEqual(images.getItemImages(item), [image]);
  assert.deepEqual(JSON.parse(cache.get(originalImageKey))[item.id], ['https://example.com/local.png']);
  failWrites = true;
  await assert.rejects(images.saveItemImages(item.id, ['https://example.com/failed.png']));
  failWrites = false;
  assert.deepEqual(images.getItemImages(item), [image], 'failed save must retain visible images');
  await images.saveItemImages(item.id, []);
  assert.deepEqual(images.getItemImages(item), [], 'empty gallery must not restore defaults');
  const knowledge = await import('../src/utils/googleSheetsSync.ts');
  cache.set('nonghome_synced_knowledge_items', '[{"id":"localBackup"}]');
  await knowledge.saveSyncedKnowledgeItems([{ id: 'verified', title: 'Test' }], 'newSheet');
  assert.equal(knowledge.getSyncedKnowledgeItems()[0].id, 'verified');
  assert.equal(JSON.parse(cache.get('nonghome_synced_knowledge_items'))[0].id, 'localBackup');
  quotaFull = false;
  const other = new SharedContentClient('/api/sync/knowledge');
  await other.save('main', { items: [{ id: 'device2' }], sheetUrl: 'newSheet', lastSynced: 'now' });
  let loaded;
  const stop = knowledge.syncKnowledgeWithServer(items => { loaded = items; });
  for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(loaded[0].id, 'device2', 'watcher receives another device update');
  const timer = [...timers.values()][0];
  await other.save('main', { items: null, sheetUrl: '', lastSynced: null });
  await timer();
  assert.equal(knowledge.getSyncedKnowledgeItems(), null, 'central reset propagates');
  stop();
  assert.equal(timers.size, 0, 'subscription cleans up');
});
