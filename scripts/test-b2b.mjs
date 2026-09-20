import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(resolve('.b2b-test-'));
const storage = new Map();
globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) };
try {
  for (const [entry, name] of [['src/utils/b2bService.ts', 'service'], ['lib/b2bMutation.ts', 'mutation']]) {
    await build({ entryPoints: [entry], outfile: join(dir, name + '.mjs'), bundle: true, platform: 'node', format: 'esm' });
  }
  const service = await import(pathToFileURL(join(dir, 'service.mjs')));
  const { applyB2BMutation } = await import(pathToFileURL(join(dir, 'mutation.mjs')));
  let data = { leads: [{ id: 'L1' }], appointments: [{ id: 'A1', title: 'test' }] };
  let fail = false;
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls++;
    if (fail) return { ok: false, json: async () => ({ error: 'test database unavailable' }) };
    if (options.method === 'POST') data = applyB2BMutation(data, JSON.parse(options.body));
    return { ok: true, json: async () => ({ success: true, ...structuredClone(data) }) };
  };
  let shown;
  const unsubscribe = service.subscribeCentralB2B(value => { shown = value; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(shown.appointments.length, 1);
  const before = calls;
  assert.equal((await service.deleteCentralB2BAppointment('A1', 'Operator')).success, false);
  assert.equal(calls, before, 'unauthorized deletion must not send a request');
  assert.equal((await service.deleteCentralB2BAppointment('A1', 'Administrator')).success, true);
  assert.deepEqual(shown.appointments, []);
  assert.deepEqual(service.getCachedAppointments(), [], 'last deletion must not restore seed data');
  assert.equal(shown.leads[0].id, 'L1');
  await service.saveCentralB2BAppointment({ id: 'A2', title: 'new' }, 'Operator');
  await service.saveCentralB2BAppointment({ id: 'A2', title: 'edited', status: 'completed' }, 'Operator');
  assert.equal(shown.appointments.length, 1);
  assert.equal(shown.appointments[0].title, 'edited');
  fail = true;
  assert.equal((await service.deleteCentralB2BAppointment('A2', 'Administrator')).success, false);
  assert.equal(shown.appointments[0].id, 'A2', 'failed write must preserve visible/cache data');
  fail = false;
  await service.saveCentralB2BLead({ id: 'L2' }, 'Operator');
  await service.deleteCentralB2BLead('L1', 'Administrator');
  assert.deepEqual(shown.leads.map(x => x.id), ['L2']);
  assert.equal(shown.appointments[0].id, 'A2');
  unsubscribe();

  // An old poll arriving after a successful delete must not resurrect the item.
  let resolvePoll;
  globalThis.fetch = async (_url, options) => options.method === 'GET'
    ? new Promise(resolve => { resolvePoll = resolve; })
    : { ok: true, json: async () => ({ success: true, leads: [{ id: 'L2' }], appointments: [] }) };
  const stop = service.subscribeCentralB2B(value => { shown = value; });
  await service.deleteCentralB2BAppointment('A2', 'Administrator');
  resolvePoll({ ok: true, json: async () => ({ leads: [{ id: 'L2' }], appointments: [{ id: 'A2' }] }) });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(shown.appointments, []);
  stop();
  assert.throws(() => applyB2BMutation(data, { action: 'delete', collection: 'appointments' }));
  assert.throws(() => applyB2BMutation(data, { action: 'delete', collection: 'users', id: 'X' }));
  console.log('PASS B2B create/edit/status/delete, last-item deletion, role guard, failed persistence, stale poll, and mutation validation.');
} finally { rmSync(dir, { recursive: true, force: true }); }
