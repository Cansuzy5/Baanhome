import type { KnowledgeItem } from '../types';
import { isCustomerReady } from './knowledgeFilter';
export interface AiReply { customerAnswer: string; staffAnswer: string; referenceIds: string[]; customerReferenceIds: string[] }
export function aiEligible(item: KnowledgeItem): boolean {
  const status = String(item.status || '').toLowerCase();
  const ai = String(item.aiUsable || '').toLowerCase();
  if (['archived', 'draft', 'review'].includes(status) || ai === 'no' || String(item.dataStatus || '').toLowerCase() === 'rejected') return false;
  const now = Date.now();
  return !((item.startDate && Date.parse(item.startDate) > now) || (item.endDate && Date.parse(item.endDate) < now));
}
export function serializeKnowledge(items: KnowledgeItem[]) {
  return items.filter(aiEligible).map(item => ({ id: item.id, title: item.title, category: item.category, customerReady: isCustomerReady(item), customerMessage: isCustomerReady(item) ? item.customerMessage : '', summary: item.summary, detail: item.detail, nextActions: item.nextActions, sourceDoc: item.sourceDoc, dataStatus: item.dataStatus, competitorData: item.competitorData }));
}
export async function askConversation(query: string, items: KnowledgeItem[], history: { question: string; sourceIds?: string[]; aiAnswer?: { text: string; customerAnswer?: string; staffAnswer?: string } }[], signal: AbortSignal): Promise<AiReply> {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const timer = new AbortController();
  const abort = () => timer.abort();
  signal.addEventListener('abort', abort);
  const timeout = setTimeout(abort, 55000);
  try {
    const response = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'conversation', query, contextItems: serializeKnowledge(items), history: history.slice(-4).map(t => ({ question: t.question.slice(0, 1000), subjects: items.filter(i => t.sourceIds?.includes(i.id) && aiEligible(i)).map(i => i.title).slice(0, 12), customerAnswer: (t.aiAnswer?.customerAnswer || '').slice(0, 2000), staffAnswer: (t.aiAnswer?.staffAnswer || '').slice(0, 2000) })) }), signal: timer.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.isFallback || (!data.customerAnswer && !data.staffAnswer)) throw new Error(data.error || 'AI ตอบไม่สำเร็จ กรุณาลองใหม่');
    if (!Array.isArray(data.referenceIds) || !Array.isArray(data.customerReferenceIds) || (data.customerAnswer && !data.customerReferenceIds.length)) throw new Error('AI ส่งข้อมูลอ้างอิงไม่ครบ กรุณาลองใหม่');
    const allowed = new Set(items.filter(aiEligible).map(i => i.id));
    const customerAllowed = new Set(items.filter(isCustomerReady).map(i => i.id));
    return { customerAnswer: String(data.customerAnswer || ''), staffAnswer: String(data.staffAnswer || ''), referenceIds: (data.referenceIds || []).filter((id: string) => allowed.has(id)), customerReferenceIds: (data.customerReferenceIds || []).filter((id: string) => customerAllowed.has(id)) };
  } catch (error: any) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    if (timer.signal.aborted) throw new Error('AI ตอบช้ากว่าปกติ กรุณาลองใหม่');
    throw error;
  } finally { clearTimeout(timeout); signal.removeEventListener('abort', abort); }
}
