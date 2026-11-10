import assert from 'node:assert/strict';
import test from 'node:test';
import { answerConversation } from '../lib/aiConversation.ts';

const handbook = { id: 'handbook', title: 'คู่มือรับเรื่องร้องเรียน', category: 'customer-service', summary: 'แนวทางภายใน: บันทึก CRM', customerReady: false };
const booking = { id: 'booking', title: 'เงื่อนไขจอง', category: 'reservation', summary: 'ข้อมูลภายใน', customerReady: true, customerMessage: 'ขอตรวจสอบคิวกับทีมก่อนค่ะ' };

test('face-to-face correction uses the same complaint and keeps internal evidence in staff output', async () => {
  const prompts = [];
  const answer = await answerConversation({
    query: 'ไม่ใช่ ตอนนี้ยืนอยู่กับลูกค้า',
    history: [{ question: 'ลูกค้าบอกอาหารไม่อร่อย จะบอกยังไงดี', staffAnswer: 'ตัวอย่างคำตอบแชต' }],
    contextItems: [handbook],
  }, async prompt => {
    prompts.push(prompt);
    return prompts.length === 1 ? JSON.stringify({ ids: ['handbook'], audience: 'customer', responseMode: 'spoken' })
      : JSON.stringify({ text: 'ขอโทษนะคะ ขอทราบว่าตรงไหนที่ไม่ถูกปากค่ะ', ids: ['handbook'] });
  });
  assert.match(prompts[0], /ให้ข้อความล่าสุดชนะเมื่อแก้สถานการณ์/);
  assert.match(prompts[0], /ลูกค้าบอกอาหารไม่อร่อย/);
  assert.match(prompts[1], /ขึ้นต้นด้วยประโยคภาษาพูด/);
  assert.match(prompts[1], /ไม่เปิดเผยข้อมูลภายใน/);
  assert.equal(prompts.length, 2);
  assert.equal(answer.customerAnswer, '');
  assert.deepEqual(answer.referenceIds, ['handbook']);
});

test('response modes distinguish scripts, next steps, full procedures and verified facts', async () => {
  for (const [query, responseMode, audience, guidance] of [
    ['ลูกค้าถามเข้าพักก่อนเวลา จะพิมพ์ตอบในไลน์ยังไง', 'message', 'customer', /คัดลอกส่งลูกค้าได้ทันที/],
    ['ลูกค้าขอใบเสนอราคาจัดเลี้ยง ตอนนี้ต้องทำอะไร', 'action', 'staff', /บอกสิ่งแรกที่ควรทำทันที/],
    ['ขอขั้นตอนรับเรื่องร้องเรียนทั้งหมด', 'procedure', 'staff', /เรียงขั้นตอนตามคู่มือให้ครบ/],
    ['ราคาเท่าไรและมีคิวว่างไหม', 'fact', 'staff', /ราคาสุดท้ายที่ต้องตรวจจริง/],
    ['คำถามทั่วไป', 'invalid', 'staff', /ตอบสิ่งที่ผู้ใช้ต้องใช้ก่อน/],
  ]) {
    let calls = 0;
    const result = await answerConversation({ query, contextItems: [booking] }, async prompt => {
      if (++calls === 1) return JSON.stringify({ ids: ['booking'], audience, responseMode });
      assert.match(prompt, guidance);
      assert.match(prompt, /ห้ามรับปากเรื่องส่วนลด คืนเงิน/);
      if (audience === 'customer') assert.doesNotMatch(prompt, /"summary":"ข้อมูลภายใน"/);
      return JSON.stringify({ text: 'คำตอบทดสอบ', ids: ['booking'] });
    });
    assert.equal(calls, 2);
    assert.deepEqual(result.referenceIds, ['booking']);
  }
});

test('when both sections are requested, the staff section focuses on the next step', async () => {
  let calls = 0;
  const reply = await answerConversation({ query: 'ขอคำพูดกับลูกค้าตอนนี้และขั้นตอนสำหรับพนักงาน', contextItems: [handbook, booking] }, async prompt => {
    if (++calls === 1) return JSON.stringify({ ids: ['handbook', 'booking'], audience: 'both', responseMode: 'spoken' });
    if (prompt.includes('ใช้เฉพาะ customerMessage')) {
      assert.match(prompt, /ขึ้นต้นด้วยประโยคภาษาพูด/);
      assert.doesNotMatch(prompt, /แนวทางภายใน/);
      return '{"text":"ข้อความสำหรับลูกค้า","ids":["booking"]}';
    }
    assert.match(prompt, /บอกสิ่งแรกที่ควรทำทันที/);
    return '{"text":"ขั้นตอนพนักงาน","ids":["handbook"]}';
  });
  assert.deepEqual(reply.customerReferenceIds, ['booking']);
  assert.deepEqual(reply.referenceIds, ['booking', 'handbook']);
});
