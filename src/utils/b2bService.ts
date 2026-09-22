import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
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
  return cached(LEADS_STORAGE_KEY, []);
}
export function getCachedAppointments(): B2BAppointment[] {
  return cached(APPOINTMENTS_STORAGE_KEY, []);
}
function publish(data: B2BData) {
  if (!Array.isArray(data.leads) || !Array.isArray(data.appointments)) {
    throw new Error('รูปแบบข้อมูล B2B ไม่ถูกต้อง');
  }

  // IMPORTANT: Central server/Firestore is authoritative.
  // Never merge stale local cache back into server results, because doing so
  // resurrects records that were intentionally deleted on another write/device.
  const centralData: B2BData = {
    leads: data.leads,
    appointments: data.appointments,
  };

  try {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(centralData.leads));
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(centralData.appointments));
  } catch {
    /* Cache failure must not undo a durable save. */
  }

  for (const listener of listeners) listener(centralData);
}
async function request(body?: unknown): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('/api/sync/b2b', {
      method: body === undefined ? 'GET' : 'POST',
      cache: 'no-store',
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
export function subscribeCentralB2B(onUpdate:(data:B2BData)=>void):()=>void {
 listeners.add(onUpdate);
 // Initialize the canonical document from durable legacy storage, if necessary.
 void request().catch(()=>window.dispatchEvent(new CustomEvent('baanhome-sync-error',{detail:'ตรวจสอบฐานนัดหมายกลางไม่สำเร็จ กรุณาลองใหม่'})));

 const unsubscribe=onSnapshot(doc(db,'systemConfig','b2b'),{includeMetadataChanges:true},snapshot=>{
  if(snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites)return;
  const value=snapshot.exists()?snapshot.data().payload:null;
  publish({leads:Array.isArray(value?.leads)?value.leads:[],appointments:Array.isArray(value?.appointments)?value.appointments:[]});
 },()=>window.dispatchEvent(new CustomEvent('baanhome-sync-error',{detail:'อ่านข้อมูลนัดหมายจาก Firestore ไม่สำเร็จ ข้อมูลอาจยังไม่ล่าสุด'})));
 return ()=>{unsubscribe();listeners.delete(onUpdate);};
}
let queue: Promise<unknown> = Promise.resolve();
function mutate(body: unknown, allowed: boolean): Promise<{ success: boolean; error?: string }> {
  if (!allowed) return Promise.resolve({ success: false, error: 'สิทธิ์ไม่เพียงพอสำหรับการดำเนินการนี้' });
  const run = async () => {
    writes++; revision++;
    try {
      const result = await request(body);
      // Publish the transaction response immediately. This keeps the next queued edit
      // on the same device aligned with the server revision before onSnapshot arrives.
      if (Array.isArray(result.leads) && Array.isArray(result.appointments)) {
        publish({ leads: result.leads, appointments: result.appointments });
      }
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
  return mutate(
    { action: 'upsert', collection: 'leads', item: lead, expectedRevision: lead._revision },
    canUserEditOperational(role)
  );
}
export function deleteCentralB2BLead(id: string, role?: UserRole) {
  return mutate({ action: 'delete', collection: 'leads', id }, canUserManageSystem(role));
}
export function saveCentralB2BAppointment(appointment: B2BAppointment, role?: UserRole) {
  return mutate(
    { action: 'upsert', collection: 'appointments', item: appointment, expectedRevision: appointment._revision },
    canUserEditOperational(role)
  );
}
export function saveCentralB2BWorkflow(
  payload: { lead?: B2BLead; appointment?: B2BAppointment; deleteAppointmentId?: string },
  role?: UserRole
) {
  return mutate(
    {
      action: 'workflow',
      ...payload,
      expectedLeadRevision: payload.lead?._revision,
      expectedAppointmentRevision: payload.appointment?._revision,
    },
    canUserEditOperational(role)
  );
}
export function deleteCentralB2BAppointment(id: string, role?: UserRole) {
  return mutate({ action: 'delete', collection: 'appointments', id }, canUserManageSystem(role));
}
export function resetCentralB2BToDefault(role?: UserRole) {
  return Promise.resolve({success:false,error:'ปิดการรีเซ็ตข้อมูลตัวอย่าง เพื่อป้องกันการทับฐานข้อมูลกลาง กรุณาจัดการรายการที่ต้องการเป็นรายรายการ'});
}
