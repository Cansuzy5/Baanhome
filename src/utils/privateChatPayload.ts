import type { ConversationTurn } from './qaConversation';
export const CHAT_DAYS = 30;
export const CHAT_LIMIT = 20;
export const CHAT_BYTES = 180000;
export function chatPayload(input: unknown, now = Date.now()): string {
  if (!Array.isArray(input)) throw new Error('รูปแบบประวัติไม่ถูกต้อง');
  const ids = (v: unknown) => Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 30).map(x => x.slice(0, 128)) : [];
  const text = (v: unknown, limit: number) => typeof v === 'string' ? v.slice(0, limit) : '';
  const turns: ConversationTurn[] = input.filter(t => t && typeof t.id === 'string' && typeof t.question === 'string' && Number.isFinite(Date.parse(t.createdAt)) && Date.parse(t.createdAt) <= now && Date.parse(t.createdAt) >= now - CHAT_DAYS * 86400000).slice(-CHAT_LIMIT).map(t => {
    const customerAnswer = text(t.aiAnswer?.customerAnswer, 20000);
    const staffAnswer = text(t.aiAnswer?.staffAnswer, 20000);
    return { id: text(t.id, 128), question: text(t.question, 1000), searchQuery: text(t.searchQuery || t.question, 1600), createdAt: new Date(t.createdAt).toISOString(), sourceIds: ids(t.sourceIds), usedContext: !!t.usedContext,
      ...(customerAnswer || staffAnswer ? { aiAnswer: { text: customerAnswer || staffAnswer, customerAnswer, staffAnswer, references: ids(t.aiAnswer.references), customerReferenceIds: ids(t.aiAnswer.customerReferenceIds) }, restored: true } : {}) };
  });
  const payload = JSON.stringify(turns);
  if (new TextEncoder().encode(payload).length > CHAT_BYTES) throw new Error('ประวัติมีขนาดเกิน 180 KB กรุณาเริ่มบทสนทนาใหม่ก่อนสำรอง');
  return payload;
}
