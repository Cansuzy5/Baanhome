export interface SearchAnalyticsEvent {
  id: string;
  timestamp: string;
  staffId: string;
  staffName: string;
  department: string;
  question: string;
  found: boolean;
  resultCount: number;
}
export const normalizeQuestion = (question: string) => question.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('th-TH');
export const bangkokDate = (timestamp: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(timestamp));
export function summarizeSearches(events: SearchAnalyticsEvent[]) {
  const unique = [...new Map(events.map(event => [event.id, event])).values()];
  const found = unique.filter(event => event.found).length;
  const rank = (key: (event: SearchAnalyticsEvent) => string, rows = unique) => {
    const counts = new Map<string, number>();
    rows.forEach(event => { const value = key(event); counts.set(value, (counts.get(value) || 0) + 1); });
    return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'th'));
  };
  const staff = new Map<string, { id: string; label: string; department: string; count: number }>();
  unique.forEach(event => {
    const row = staff.get(event.staffId) || { id: event.staffId, label: event.staffName, department: event.department, count: 0 };
    row.count++; staff.set(event.staffId, row);
  });
  return {
    total: unique.length, activeUsers: staff.size, found, missing: unique.length - found,
    coverage: unique.length ? found / unique.length * 100 : null,
    gap: unique.length ? (unique.length - found) / unique.length * 100 : null,
    staff: [...staff.values()].sort((a, b) => b.count - a.count),
    departments: rank(event => event.department || 'ไม่ระบุแผนก'),
    daily: rank(event => bangkokDate(event.timestamp)).sort((a, b) => a.label.localeCompare(b.label)),
    questions: rank(event => normalizeQuestion(event.question)).slice(0, 10),
    gaps: rank(event => normalizeQuestion(event.question), unique.filter(event => !event.found)).slice(0, 10),
  };
}
