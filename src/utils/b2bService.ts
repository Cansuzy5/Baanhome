import { B2BLead, B2BAppointment, UserRole } from '../types';
import { B2B_LEADS } from '../data/b2bPartnerships';
import { INITIAL_B2B_APPOINTMENTS } from '../data/b2bAppointments';

const LEADS_STORAGE_KEY = 'baan_home_b2b_leads_v2';
const APPOINTMENTS_STORAGE_KEY = 'baan_home_b2b_appointments_v2';
const listeners = new Set<(data: B2BData) => void>();
type B2BData = { leads: B2BLead[]; appointments: B2BAppointment[] };
let revision = 0;
let writes = 0;

export function canUserEditOperational(role?: UserRole): boolean {
  return role === 'Operator' || role === 'Administrator';
}
export function canUserManageSystem(role?: UserRole): boolean {
  return role === 'Administrator';
}
function cached<T>(key: string, defaults: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const value = JSON.parse(raw);
      if (Array.isArray(value)) return value;
    }
  } catch {}
  return defaults;
}
export function getCachedLeads(): B2BLead[] {
  return cached(LEADS_STORAGE_KEY, B2B_LEADS);
}
export function getCachedAppointments(): B2BAppointment[] {
  return cached(APPOINTMENTS_STORAGE_KEY, INITIAL_B2B_APPOINTMENTS);
}
function publish(data: B2BData) {
  if (!Array.isArray(data.leads) || !Array.isArray(data.appointments)) throw new Error('รูปแบบข้อมูล B2B ไม่ถูกต้อง');

  // Merge appointments with local cache so newly created appointments aren't dropped
  const localApts = getCachedAppointments();
  const aptMap = new Map<string, B2BAppointment>();
  data.appointments.forEach((a) => aptMap.set(a.id, a));
  localApts.forEach((a) => {
    if (!aptMap.has(a.id)) {
      aptMap.set(a.id, a);
    }
  });
  const mergedAppointments = Array.from(aptMap.values());

  // Merge leads with local cache
  const localLeads = getCachedLeads();
  const leadMap = new Map<string, B2BLead>();
  data.leads.forEach((l) => leadMap.set(l.id, l));
  localLeads.forEach((l) => {
    if (!leadMap.has(l.id)) {
      leadMap.set(l.id, l);
    }
  });
  const mergedLeads = Array.from(leadMap.values());

  const mergedData: B2BData = {
    leads: mergedLeads.length > 0 ? mergedLeads : (data.leads.length > 0 ? data.leads : B2B_LEADS),
    appointments: mergedAppointments,
  };

  try {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(mergedData.leads));
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(mergedData.appointments));
  } catch { /* Cache failure must not undo a durable save. */ }
  for (const listener of listeners) listener(mergedData);
}
async function request(body?: unknown): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('/api/sync/b2b', {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok || (body !== undefined && data.success !== true)) {
      throw new Error(data.error || 'บันทึกไม่สำเร็จ กรุณาลองใหม่');
    }
    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') throw new Error('การเชื่อมต่อใช้เวลานาน กรุณารีเฟรชตรวจสอบผลก่อนลองอีกครั้ง');
    throw error;
  } finally { clearTimeout(timer); }
}
export function subscribeCentralB2B(onUpdate: (data: B2BData) => void): () => void {
  let active = true;
  let fetching = false;
  listeners.add(onUpdate);
  onUpdate({ leads: getCachedLeads(), appointments: getCachedAppointments() });
  const refresh = async () => {
    if (fetching || writes) return;
    fetching = true;
    const startedAt = revision;
    try {
      const data = await request();
      if (active && !writes && startedAt === revision) publish(data);
    } catch (error) { console.warn('B2B sync failed:', error); }
    finally { fetching = false; }
  };
  void refresh();
  const timer = setInterval(refresh, 10000);
  return () => { active = false; clearInterval(timer); listeners.delete(onUpdate); };
}
let queue: Promise<unknown> = Promise.resolve();
function mutate(body: unknown, allowed: boolean): Promise<{ success: boolean; error?: string }> {
  if (!allowed) return Promise.resolve({ success: false, error: 'สิทธิ์ไม่เพียงพอสำหรับการดำเนินการนี้' });
  const run = async () => {
    writes++; revision++;
    try {
      const result = await request(body);
      publish(result);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'บันทึกไม่สำเร็จ' };
    } finally { writes--; revision++; }
  };
  const result = queue.then(run, run);
  queue = result;
  return result;
}
export function saveCentralB2BLead(lead: B2BLead, role?: UserRole) {
  return mutate({ action: 'upsert', collection: 'leads', item: lead }, canUserEditOperational(role));
}
export function deleteCentralB2BLead(id: string, role?: UserRole) {
  return mutate({ action: 'delete', collection: 'leads', id }, canUserManageSystem(role));
}
export function saveCentralB2BAppointment(appointment: B2BAppointment, role?: UserRole) {
  return mutate({ action: 'upsert', collection: 'appointments', item: appointment }, canUserEditOperational(role));
}
export function deleteCentralB2BAppointment(id: string, role?: UserRole) {
  return mutate({ action: 'delete', collection: 'appointments', id }, canUserManageSystem(role));
}
export function resetCentralB2BToDefault(role?: UserRole) {
  return mutate({ leads: B2B_LEADS, appointments: INITIAL_B2B_APPOINTMENTS }, canUserManageSystem(role));
}
