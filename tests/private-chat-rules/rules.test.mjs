import { before, after, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, collection, getDocs, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

// This suite never accepts a real project or remote emulator address.
const projectId = 'demo-baanhome-chat';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8187') throw new Error('Run through npm test with the local demo emulator');
const existing = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
const fragment = readFileSync(new URL('../../docs/private-chat/firestore-addition.rules', import.meta.url), 'utf8');
const anchor = 'match /databases/{database}/documents {';
if (existing.split(anchor).length !== 2) throw new Error('Expected exactly one database rules block');
const rules = existing.replace(anchor, `${anchor}\n${fragment}`);
let env;
const record = (overrides = {}) => ({
  version: '12345678-1234-1234-1234-123456789abc', payload: '[]',
  updatedAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 30 * 86400000), ...overrides,
});
const own = () => doc(env.authenticatedContext('alice').firestore(), 'privateChatBackups/alice');
before(async () => { env = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8187, rules } }); });
beforeEach(async () => { await env.clearFirestore(); });
after(async () => { await env?.cleanup(); });

test('owner can create, get, update and delete own backup', async () => {
  const ref = own();
  await assertSucceeds(setDoc(ref, record()));
  await assertSucceeds(getDoc(ref));
  await assertSucceeds(updateDoc(ref, record({ payload: '["changed"]' })));
  await assertSucceeds(deleteDoc(ref));
});
for (const actor of ['bob', null]) {
  test(`${actor || 'anonymous'} cannot read, create, update or delete Alice backup`, async () => {
    const db = actor ? env.authenticatedContext(actor).firestore() : env.unauthenticatedContext().firestore();
    const ref = doc(db, 'privateChatBackups/alice');
    await assertFails(setDoc(ref, record()));
    await assertSucceeds(setDoc(own(), record()));
    await assertFails(getDoc(ref));
    await assertFails(updateDoc(ref, record()));
    await assertFails(deleteDoc(ref));
  });
}
test('owner cannot list backups or write nested documents', async () => {
  const db = env.authenticatedContext('alice').firestore();
  await assertFails(getDocs(collection(db, 'privateChatBackups')));
  await assertFails(setDoc(doc(db, 'privateChatBackups/alice/nested/item'), record()));
});
test('malformed, oversized and invalid-expiry writes fail', async () => {
  for (const override of [
    { extra: true }, { version: 'short' }, { payload: {} }, { payload: 'x'.repeat(180001) },
    { expiresAt: Timestamp.fromMillis(Date.now() - 60000) },
    { expiresAt: Timestamp.fromMillis(Date.now() + 32 * 86400000) },
    { updatedAt: Timestamp.fromMillis(0) },
  ]) await assertFails(setDoc(own(), record(override)));
  await assertFails(setDoc(own(), { payload: '[]' }));
});
test('existing shared configuration access remains unchanged', async () => {
  const ref = doc(env.unauthenticatedContext().firestore(), 'systemConfig/private-chat-regression');
  await assertSucceeds(setDoc(ref, { value: 'emulator-only' }));
  await assertSucceeds(getDoc(ref));
});
