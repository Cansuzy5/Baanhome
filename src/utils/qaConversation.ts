import type { KnowledgeItem } from '../types';
import { isCustomerReady } from './knowledgeFilter';

export interface ConversationTurn {
  id: string;
  question: string;
  searchQuery: string;
  sourceIds: string[];
  createdAt: string;
  usedContext: boolean;
  aiAnswer?: { text: string; references: string[] };
}
export const MAX_CONVERSATION_TURNS = 20;
const keyFor = (accountId: string) => `baanhome_qa_conversation_v1:${encodeURIComponent(accountId)}`;
export function readConversation(accountId: string): ConversationTurn[] {
  if (!accountId) return [];
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(accountId)) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(t => t && typeof t.id === 'string' && typeof t.question === 'string' && typeof t.searchQuery === 'string' && typeof t.createdAt === 'string' && Array.isArray(t.sourceIds) && t.sourceIds.every((id: unknown) => typeof id === 'string')).slice(-MAX_CONVERSATION_TURNS).map(t => ({ ...t, question: t.question.slice(0, 1000), searchQuery: t.searchQuery.slice(0, 1600), sourceIds: t.sourceIds.slice(0, 30), aiAnswer: undefined }));
  } catch { return []; }
}
export function saveConversation(accountId: string, turns: ConversationTurn[]) {
  if (!accountId) return;
  // Keep references, not copied knowledge/images or generated facts. On reload,
  // the UI resolves each ID against the latest eligible knowledge base.
  const value = turns.slice(-MAX_CONVERSATION_TURNS).map(({ aiAnswer, ...turn }) => turn);
  try { localStorage.setItem(keyFor(accountId), JSON.stringify(value)); } catch { /* session remains usable */ }
}
export function clearConversation(accountId: string) {
  try { localStorage.removeItem(keyFor(accountId)); } catch { /* session remains usable */ }
}

const explicitSubject = /พูลวิลล่า|รีสอร์ท|ห้องพัก|ห้องอาหาร|อาหารเช้า|เมนู|ต้มยำ|ผัดไทย|กุ้งเผา|ไก่ย่าง|ส้มตำ|ข้าวผัด|กะเพรา|กระเพรา|ทอดมัน|ลาบ|ยำวุ้นเส้น|คอหมู|คาราโอเกะ|ห้องวีไอพี|สัมมนา|จัดเลี้ยง|สัตว์เลี้ยง|เช็คอิน|เช็คเอาต์|มัดจำ|แผนที่|พนักงาน|สวัสดิการ|คู่แข่ง|pool\s?villa|resort|check.?in|check.?out/i;
const followup = /^(แล้ว|และ|ถ้า|อันนี้|อันนั้น|ที่นี่|แบบนี้|ต่อ)|เท่าไหร่|กี่บาท|กี่คน|มี.*ไหม|ได้.*ไหม|ล่ะ|ละ\s*$|เพิ่มเติม|เงื่อนไข/;
export function resolveFollowup(question: string, turns: ConversationTurn[], items: KnowledgeItem[]) {
  const last = turns[turns.length - 1];
  const previous = last?.sourceIds.map(id => items.find(item => item.id === id)).filter(Boolean) as KnowledgeItem[] | undefined;
  if (!last || !previous?.length || explicitSubject.test(question) || !followup.test(question)) return { query: question, usedContext: false };
  // Carry the original subject, not the previous expanded query (which would
  // accumulate old questions). Current search ranking remains unchanged.
  const subject = previous[0].title.slice(0, 160);
  return { query: `${question} ${subject}`, usedContext: true };
}
export function recentAiQuestions(turns: ConversationTurn[], items: KnowledgeItem[]): string[] {
  const allowed = new Set(items.filter(isCustomerReady).map(item => item.id));
  return turns.slice(-2).filter(t => allowed.has(t.sourceIds[0])).map(t => t.question.slice(0, 300));
}
export function withRecentQuestions(query: string, questions: string[] = []): string {
  const recent = questions.filter(q => typeof q === 'string' && q.trim()).slice(-2).map(q => q.slice(0, 300));
  if (!recent.length) return query;
  return `บริบทคำถามก่อนหน้า (ใช้ระบุเรื่องที่ถามต่อเท่านั้น ไม่ใช่แหล่งยืนยันข้อเท็จจริง):\n${recent.map(q => `- ${q}`).join('\n')}\n\nตอบคำถามล่าสุดโดยยึดฐานความรู้ปัจจุบัน:\n${query}`;
}
