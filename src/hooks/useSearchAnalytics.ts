import { useEffect, useRef } from 'react';
import type { StaffProfile } from '../types';
import { normalizeQuestion } from '../utils/nongHomeAnalyticsModel';

// Independent observer. No await, alerts, retries, local storage, or shared sync errors.
export function useSearchAnalytics(query: string, staff: StaffProfile | undefined, outcome: () => number | null) {
  const latest = useRef(outcome);
  latest.current = outcome;
  const lastRecorded = useRef('');
  useEffect(() => {
    const normalized = normalizeQuestion(query);
    if (!normalized) { lastRecorded.current = ''; return; }
    if (normalized.length < 2 || !staff?.id) return;
    const key = `${staff.id}:${normalized}`;
    if (key === lastRecorded.current) return;
    const timer = setTimeout(() => {
      try {
        const count = latest.current();
        if (count === null) return;
        lastRecorded.current = key;
        const timestamp = new Date().toISOString();
        const id = `${Date.parse(timestamp)}-${crypto.randomUUID()}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        void fetch('/api/nong-home-analytics', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ action: 'record', event: { id, timestamp, staffId: staff.id, staffName: staff.name, department: staff.department || 'ไม่ระบุแผนก', question: query.trim().slice(0, 500), resultCount: count, found: count > 0 } }),
        }).catch(() => {}).finally(() => clearTimeout(timeout));
      } catch { /* Analytics must never interrupt search. */ }
    }, 1500);
    return () => clearTimeout(timer);
  }, [query, staff?.id, staff?.name, staff?.department]);
}
