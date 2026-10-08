import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import assert from 'node:assert/strict';
import test from 'node:test';
registerHooks({
  resolve(s, c, next) {
    if (s.startsWith('.')) {
      const u = new URL(s.endsWith('.js') ? s.slice(0, -3) + '.ts' : /\.[a-z]+$/.test(s) ? s : s + '.ts', c.parentURL);
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

const { answerConversation } = await import('../lib/aiConversation.ts');
const { serializeKnowledge, askConversation } = await import('../src/utils/aiConversation.ts');
test('semantic selection and separate generation keep internal facts out of customer prompt', async () => {
  const items = serializeKnowledge([{ ...room, summary: 'internal secret pricing strategy', detail: ['staff instructions'] }, { ...internal, summary: 'confidential salary', detail: [] }]);
  const prompts = [];
  const result = await answerConversation({ query: 'ขอทั้งข้อความลูกค้าและแนวทางพนักงาน', contextItems: items, history: [{ question: 'เรื่องห้องพัก', staffAnswer: 'private previous answer', customerAnswer: 'previous customer reply' }] }, async prompt => {
    prompts.push(prompt);
    if (prompts.length === 1) return JSON.stringify({ ids: ['room', 'internal', 'invented'], audience: 'both' });
    if (prompt.includes('ใช้เฉพาะ customerMessage')) {
      assert.equal(prompt.includes('confidential salary'), false);
      assert.equal(prompt.includes('internal secret pricing strategy'), false);
      assert.equal(prompt.includes('private previous answer'), false);
      return JSON.stringify({ text: 'ข้อความลูกค้า', ids: ['room'] });
    }
    assert.ok(prompt.includes('confidential salary'));
    return JSON.stringify({ text: 'สำหรับพนักงาน', ids: ['internal', 'invented'] });
  });
  assert.deepEqual(result, { customerAnswer: 'ข้อความลูกค้า', staffAnswer: 'สำหรับพนักงาน', referenceIds: ['room', 'internal'], customerReferenceIds: ['room'] });
  assert.equal(prompts.length, 3);
});
test('API failure and invalid references are errors rather than successful fallback answers', async () => {
  let count = 0;
  await assert.rejects(answerConversation({ query: 'ราคา', contextItems: serializeKnowledge([room]) }, async () => ++count === 1 ? '{"ids":["room"],"audience":"customer"}' : '{"text":"invalid customer answer","ids":["internal"]}'), /evidence/);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, json: async () => ({ error: 'API unavailable' }) });
  try { await assert.rejects(askConversation('ราคา', [room], [], new AbortController().signal), /API unavailable/); }
  finally { globalThis.fetch = originalFetch; }
});
test('grouped fish menus resolve exact dishes in their species sections', () => {
  const photos = getMenuIllustrations({ title: 'เมนูปลา: ปลานิล ปลากะพง', category: 'restaurant', detail: ['ปลานิล: นึ่งมะนาว 365 | ทอดสมุนไพร 265'] });
  assert.deepEqual(photos.map(p => p.name), ['ปลานิลนึ่งมะนาว']);
  assert.equal(getMenuIllustrations({ title: 'ข้อมูลปลา', category: 'restaurant', detail: ['ลูกค้าชอบปลานิลนึ่งมะนาว'] }).length, 0);
});
const { applyB2BMutation } = await import('../lib/b2bMutation.ts');
test('existing B2B round keeps appointment closure and starts an independent new round', () => {
  for (const outcome of ['success', 'unsuccessful']) {
    let data = { leads: [{ id: 'org', name: 'องค์กรเดิม', pipelineStage: 'ยังไม่ติดต่อ' }], appointments: [] };
    data = applyB2BMutation(data, { action: 'workflow', lead: { ...data.leads[0], pipelineStage: 'นัดเข้าพบ' }, appointment: { id: 'old', leadId: 'org', status: 'scheduled', date: '2026-09-22' } });
    assert.throws(() => applyB2BMutation(data, { action: 'closeCycleFromAppointment', appointmentId: 'old', outcome, closedAt: '2026-09-25', closureId: 'closed' }), /เข้าพบแล้ว/);
    data = applyB2BMutation(data, { action: 'workflow', lead: { ...data.leads[0], pipelineStage: 'ติดตามต่อ' }, appointment: { ...data.appointments[0], status: 'completed' } });
    data = applyB2BMutation(data, { action: 'closeCycleFromAppointment', appointmentId: 'old', outcome, closedAt: '2026-09-25', closureId: 'closed' });
    assert.equal(data.leads[0].pipelineStage, 'ยังไม่ติดต่อ');
    assert.equal(data.leads[0].salesClosures.length, 1);
    assert.equal(data.leads[0].salesClosures[0].sourceAppointmentId, 'old');
    assert.equal(data.appointments[0].status, 'completed');
    assert.equal(data.appointments[0].salesCycleOutcome, outcome);
    assert.equal(data.appointments[0].salesCycleClosedAt, '2026-09-25');
    assert.ok(data.leads[0].history.length);
    const snapshot = structuredClone(data.appointments[0]);
    data = applyB2BMutation(data, { action: 'workflow', lead: { ...data.leads[0], pipelineStage: 'นัดเข้าพบ' }, appointment: { id: 'new', leadId: 'org', status: 'scheduled', date: '2026-10-05' } });
    assert.deepEqual(data.appointments.find(a => a.id === 'old'), snapshot);
    assert.equal(data.appointments.find(a => a.id === 'new').salesCycleOutcome, undefined);
    assert.throws(() => applyB2BMutation(data, { action: 'upsert', collection: 'appointments', item: { ...snapshot, status: 'scheduled' } }), /อ่านได้/);
    assert.throws(() => applyB2BMutation(data, { action: 'delete', collection: 'appointments', id: 'old' }), /แอดมิน/);
  }
});
const { default: askHandler } = await import('../api/ask.ts');
test('conversation HTTP handler returns structured AI response and exposes failed provider as 502', async () => {
  const oldFetch = globalThis.fetch;
  const oldDeepseek = process.env.DEEPSEEK_API_KEY;
  const oldGemini = process.env.GEMINI_API_KEY;
  const res = { code: 200, data: undefined, setHeader() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  const req = { method: 'POST', body: { mode: 'conversation', query: 'ห้องพักราคาเท่าไหร่', contextItems: serializeKnowledge([room]) } };
  let calls = 0;
  try {
    process.env.DEEPSEEK_API_KEY = 'isolated-test-key'; delete process.env.GEMINI_API_KEY;
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: ++calls === 1 ? '{"ids":["room"],"audience":"customer"}' : '{"text":"คำตอบลูกค้า","ids":["room"]}' } }] }) });
    await askHandler(req, res);
    assert.equal(res.code, 200); assert.equal(res.data.customerAnswer, 'คำตอบลูกค้า'); assert.equal(calls, 2);
    globalThis.fetch = async () => { throw new Error('isolated provider failure'); };
    await askHandler(req, res);
    assert.equal(res.code, 502); assert.equal(res.data.answer, undefined); assert.ok(res.data.error);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldDeepseek === undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY = oldDeepseek;
    if (oldGemini === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldGemini;
  }
});
