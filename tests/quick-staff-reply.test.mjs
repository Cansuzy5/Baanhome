import assert from 'node:assert/strict';
import test from 'node:test';
import { answerConversation } from '../lib/aiConversation.ts';

const guide = { id: 'complaints', title: 'การรับข้อร้องเรียน', summary: 'รับฟังและประสานผู้รับผิดชอบ', customerReady: false };
for (const [query, say] of [
  ['โดนลูกค้าด่าทำไงดี', 'เข้าใจว่าลูกค้าไม่สบายใจนะคะ ขอฟังว่าเกิดอะไรขึ้นค่ะ'],
  ['ลูกค้าบอกอาหารไม่อร่อยทำยังไงต่อ', 'ขอโทษนะคะ ขอทราบได้ไหมคะว่าตรงไหนที่ไม่ถูกปาก'],
]) {
  test(query + ' is formatted as immediate help even if the model selects procedure', async () => {
    let calls = 0;
    const reply = await answerConversation({ query, contextItems: [guide] }, async prompt => {
      if (++calls === 1) return '{"ids":["complaints"],"audience":"staff","responseMode":"procedure"}';
      assert.match(prompt, /บอกสิ่งแรกที่ควรทำทันที/);
      assert.match(prompt, /อย่าเหมาว่าเป็นอาหารผิดจาน/);
      return JSON.stringify({ text: 'สรุปคู่มือและขั้นตอนบันทึก CRM ที่ไม่ควรแสดงในคำตอบสั้น', ids: ['complaints'], action: 'ฟังลูกค้าให้จบ', say, next: 'ประสานผู้รับผิดชอบ' });
    });
    assert.equal(reply.staffAnswer, 'ทำก่อน: ฟังลูกค้าให้จบ\nพูดได้เลย: ' + say + '\nต่อจากนั้น: ประสานผู้รับผิดชอบ');
    assert.deepEqual(reply.referenceIds, ['complaints']);
  });
}

test('a full procedure and a reply without supporting references keep their original output', async () => {
  for (const [query, ids, expectedMode] of [
    ['ขอขั้นตอนทั้งหมดตามคู่มือว่าทำยังไงต่อ', ['complaints'], /เรียงขั้นตอนตามคู่มือให้ครบ/],
    ['ทำไงดี', [], /บอกสิ่งแรกที่ควรทำทันที/],
  ]) {
    let calls = 0;
    const reply = await answerConversation({ query, contextItems: [guide] }, async prompt => {
      if (++calls === 1) return JSON.stringify({ ids, audience: 'staff', responseMode: 'procedure' });
      assert.match(prompt, expectedMode);
      return JSON.stringify({ text: 'คำตอบเดิมตามหลักฐาน', ids, action: 'ขั้นตอนสมมติ' });
    });
    assert.equal(reply.staffAnswer, 'คำตอบเดิมตามหลักฐาน');
  }
});
