import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import assert from 'node:assert/strict';
import test from 'node:test';
registerHooks({
  resolve(s, c, next) {
    if (s.startsWith('.')) {
      const u = new URL(/\.[a-z]+$/.test(s) ? s : s + '.ts', c.parentURL);
      if (existsSync(u)) return { url: u.href, shortCircuit: true };
    }
    return next(s, c);
  },
  load(u, c, next) {
    if (u.startsWith('file:') && u.endsWith('.ts') && !u.includes('/node_modules/')) return { format: 'module', source: transformSync(readFileSync(new URL(u), 'utf8'), { loader: 'ts', format: 'esm', target: 'es2022' }).code, shortCircuit: true };
    return next(u, c);
  },
});
const { readConversation, saveConversation, clearConversation, resolveFollowup, recentAiQuestions, withRecentQuestions } = await import('../src/utils/qaConversation.ts');
const { getMenuIllustrations, appendRestaurantImage, MENU_ILLUSTRATIONS } = await import('../src/utils/menuIllustrations.ts');
const storage = new Map();
globalThis.localStorage = { getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) };
const room = { id: 'room', title: 'พูลวิลล่า', customerMessage: 'ราคาอ้างอิงจากฐาน', status: 'Published', audience: 'Both', aiUsable: 'Yes' };
const internal = { id: 'internal', title: 'เงินเดือนพนักงาน', audience: 'Employee' };
const turn = { id: '1', question: 'พูลวิลล่าราคาเท่าไหร่', searchQuery: 'พูลวิลล่า', sourceIds: ['room'], createdAt: '2026-10-08', usedContext: false, aiAnswer: { text: 'old generated facts', references: ['room'] } };
test('personal history stays with its account; reset and reload use current references', () => {
  saveConversation('A', [turn]);
  assert.equal(readConversation('B').length, 0);
  assert.equal(readConversation('A')[0].aiAnswer, undefined);
  assert.equal(JSON.stringify([...storage.values()]).includes('old generated facts'), false);
  saveConversation('B', [{ ...turn, id: '2' }]);
  clearConversation('A');
  assert.equal(readConversation('A').length, 0);
  assert.equal(readConversation('B').length, 1);
  saveConversation('C', Array.from({ length: 25 }, (_, n) => ({ ...turn, id: String(n) })));
  assert.equal(readConversation('C').length, 20);
});
test('followups carry subject once; changed topics and missing sources stay independent', () => {
  const followup = resolveFollowup('แล้วพักได้กี่คน', [turn], [room]);
  assert.deepEqual(followup, { query: 'แล้วพักได้กี่คน พูลวิลล่า', usedContext: true });
  const next = { ...turn, question: 'แล้วพักได้กี่คน', searchQuery: followup.query };
  assert.equal(resolveFollowup('มีเงื่อนไขเพิ่มเติมไหม', [turn, next], [room]).query, 'มีเงื่อนไขเพิ่มเติมไหม พูลวิลล่า');
  assert.equal(resolveFollowup('เมนูอาหารราคาเท่าไหร่', [turn], [room]).usedContext, false);
  assert.equal(resolveFollowup('ต้มยำกุ้งราคาเท่าไหร่', [turn], [room]).usedContext, false);
  assert.equal(resolveFollowup('แล้วราคาเท่าไหร่', [turn], []).usedContext, false);
});
test('AI context is bounded, only eligible recent questions, no stale generated facts', () => {
  const privateTurn = { ...turn, question: 'เงินเดือนเท่าไหร่', sourceIds: ['internal', 'room'] };
  assert.deepEqual(recentAiQuestions([turn, privateTurn], [room, internal]), [turn.question]);
  assert.deepEqual(recentAiQuestions([turn, privateTurn, privateTurn], [room, internal]), []);
  const prompt = withRecentQuestions('ล่าสุด', ['X'.repeat(2000), 'Y'.repeat(2000), 'Z'.repeat(2000)]);
  assert.equal(prompt.includes('XXX'), false);
  assert.equal(prompt.match(/Y/g).length, 300);
  assert.equal(prompt.match(/Z/g).length, 300);
  assert.equal(withRecentQuestions('คำถาม'), 'คำถาม');
});
test('food images match dish names, never incidental references or other categories', () => {
  const food = title => getMenuIllustrations({ title, category: 'restaurant' }).map(p => p.name);
  assert.deepEqual(food('ต้มยำกุ้งแม่น้ำ'), ['ต้มยำกุ้ง']);
  assert.deepEqual(food('เมนูกุ้งเผาและต้มยำกุ้งแม่น้ำ'), ['ต้มยำกุ้ง', 'กุ้งเผา']);
  assert.deepEqual(food('ข้าวผัดกุ้ง'), []);
  assert.deepEqual(food('ปลากะพงนึ่งมะนาว'), []);
  assert.deepEqual(food('ส้มตำปลาร้า'), []);
  assert.deepEqual(getMenuIllustrations({ title: 'ไก่ย่าง', category: 'resort' }), []);
  assert.deepEqual(food('เงื่อนไขการจองโต๊ะ'), []);
});
test('actual uploads replace only starter photos, preserving existing restaurant images', () => {
  const starter = MENU_ILLUSTRATIONS[0].url;
  assert.deepEqual(appendRestaurantImage([starter], 'actual.jpg'), ['actual.jpg']);
  assert.deepEqual(appendRestaurantImage(['original.jpg', starter], 'actual.jpg'), ['original.jpg', 'actual.jpg']);
});
