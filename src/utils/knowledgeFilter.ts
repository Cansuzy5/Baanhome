import { KnowledgeItem } from '../types';

/**
 * Checks if a knowledge item pertains to competitor battlecards, benchmarking,
 * or competitive intelligence. Such items are STRICTLY internal employee knowledge
 * and must NEVER be exposed as customer-facing messages.
 */
export function isCompetitorKnowledge(item?: Partial<KnowledgeItem> | null): boolean {
  if (!item) return false;

  if (item.isCompetitorBattlecard) return true;
  if (item.category === 'competitor-battlecard') return true;

  const title = (item.title || '').toLowerCase();
  const summary = (item.summary || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();
  const docSection = (item.docSection || '').toLowerCase();
  const keywords = Array.isArray(item.keywords)
    ? item.keywords.map((k) => k.toLowerCase()).join(' ')
    : '';

  // Direct keyword matching
  if (
    title.includes('คู่แข่ง') ||
    title.includes('competitor') ||
    title.includes('battlecard') ||
    title.includes('คู่เปรียบเทียบ') ||
    title.includes('ตัวเลือก:') ||
    keywords.includes('คู่แข่ง') ||
    keywords.includes('competitor') ||
    keywords.includes('battlecard') ||
    cat.includes('competitor') ||
    cat.includes('battlecard')
  ) {
    return true;
  }

  // Known Kalasin / regional competitors analyzed in Baan Home battlecards
  const knownCompetitors = [
    'chada view',
    'ชฎาวิว',
    'ริมปาว',
    'rimpao',
    'ไดโน สตูดิโอ',
    'dino studio',
    'สุภัค',
    'suphak',
    'ไพบูลย์',
    'paiboon',
    'ทีเค เรสซิเดนซ์',
    'tk residence',
  ];

  for (const comp of knownCompetitors) {
    if (title.includes(comp) || keywords.includes(comp) || docSection.includes(comp)) {
      if (
        title.includes('คู่แข่ง') ||
        title.includes('ตัวเลือก') ||
        title.includes('vs') ||
        title.includes('เทียบ') ||
        summary.includes('คู่แข่ง') ||
        summary.includes('คู่แข่งตรง') ||
        summary.includes('จุดแข็งของ') ||
        item.competitorData !== undefined
      ) {
        return true;
      }
    }
  }

  return false;
}

export function isCustomerReady(item?: KnowledgeItem | null): boolean {
  if (!item) return false;

  // RULE 0: Competitor intelligence is STRICTLY employee knowledge (STAFF ONLY)
  // Under NO circumstances may competitor analysis be marked customer ready!
  if (isCompetitorKnowledge(item)) return false;

  // Check if Customer Message has content (Mandatory: cannot send empty message)
  if (!item.customerMessage || item.customerMessage.trim().length === 0) return false;

  // Check Status: Exclude explicitly internal or archived
  const st = item.status?.toLowerCase();
  if (st === 'internal' || st === 'archived') return false;

  // Check Audience: Exclude explicitly employee-only / internal
  const aud = item.audience?.toLowerCase();
  if (aud === 'employee' || aud === 'internal') return false;

  // Check Data Status: Exclude explicitly rejected or obsolete
  const ds = item.dataStatus?.toLowerCase();
  if (ds === 'rejected') return false;

  // Check AI Usable: Exclude explicitly denied
  const ai = item.aiUsable?.toLowerCase();
  if (ai === 'no' || ai === 'employee only') return false;

  // Check Date Validity (Start Date / End Date)
  const now = new Date();
  
  if (item.startDate) {
    const start = new Date(item.startDate);
    if (!isNaN(start.getTime()) && now < start) return false;
  }
  if (item.endDate) {
    const end = new Date(item.endDate);
    if (!isNaN(end.getTime()) && now > end) return false;
  }

  return true;
}
