import { splitContent } from '../../lib/sharedContentProtocol';
type Entry = { key: string; parts: string[]; version: string };
export class SharedContentClient {
  private entries: Record<string, Entry> = {};
  private values: Record<string, any> = {};
  private initialized = false;
  private queue: Promise<any> = Promise.resolve();
  private serial<T>(work: () => Promise<T>): Promise<T> {
    const result = this.queue.then(work, work);
    this.queue = result.catch(() => {});
    return result;
  }
  version(key: string) { return this.entries[key]?.version || null; }
  constructor(private url: string) {}
  private async request(suffix = '', body?: any) {
    const response = await fetch(this.url + suffix, {
      cache: 'no-store', signal: AbortSignal.timeout(30000),
      ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `ซิงค์ฐานกลางไม่สำเร็จ (${response.status})`);
    return data;
  }
  read() { return this.serial(() => this.readCurrent()); }
  private async readCurrent() {
    const data = await this.request('?protocol=2');
    if (!data.entries || typeof data.entries !== 'object') throw new Error('Invalid shared response');
    const next: Record<string, any> = {};
    const entries: Record<string, Entry> = {};
    for (const entry of Object.values(data.entries) as Entry[]) {
      entries[entry.key] = entry;
      if (this.entries[entry.key]?.version === entry.version) next[entry.key] = this.values[entry.key];
      else {
        const parts: string[] = [];
        for (const id of entry.parts) parts.push((await this.request(`?part=${id}`)).text);
        next[entry.key] = JSON.parse(parts.join(''));
      }
    }
    this.entries = entries;
    this.values = next;
    this.initialized = true;
    return { values: next, legacy: data.legacy };
  }
  save(key: string, value: any, version?: string | null) {
    return this.serial(() => this.saveCurrent(key, value, version));
  }
  private async saveCurrent(key: string, value: any, version?: string | null) {
    if (!this.initialized) await this.readCurrent();
    const expectedVersion = version === undefined ? this.version(key) : version;
    const parts: string[] = [];
    for (const text of splitContent(value)) parts.push((await this.request('', { action: 'stage', text })).id);
    const result = await this.request('', { action: 'commit', key, parts, expectedVersion });
    if (!result.success || !result.entry?.version) throw new Error('ฐานกลางยังไม่ยืนยันการบันทึก');
    this.entries[key] = result.entry;
    this.values[key] = value;
  }
}
export function watchSharedContent(refresh: () => Promise<void>) {
  let stopped = false;
  let running = false;
  const run = async () => {
    if (stopped || running || document.hidden) return;
    running = true;
    try { await refresh(); }
    catch (error: any) { if (!stopped) window.dispatchEvent(new CustomEvent('baanhome-sync-error', { detail: error.message || 'โหลดข้อมูลกลางไม่สำเร็จ' })); }
    finally { running = false; }
  };
  void run();
  const timer = window.setInterval(run, 30000);
  window.addEventListener('focus', run);
  window.addEventListener('online', run);
  document.addEventListener('visibilitychange', run);
  return () => { stopped = true; clearInterval(timer); window.removeEventListener('focus', run); window.removeEventListener('online', run); document.removeEventListener('visibilitychange', run); };
}
