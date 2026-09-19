import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { B2BLead, B2BAppointment, UserRole } from '../types';
import { B2B_LEADS } from '../data/b2bPartnerships';
import { INITIAL_B2B_APPOINTMENTS } from '../data/b2bAppointments';

const LEADS_STORAGE_KEY = 'baan_home_b2b_leads_v2';
const APPOINTMENTS_STORAGE_KEY = 'baan_home_b2b_appointments_v2';

/**
 * Role Permission Checkers
 * Knowledge User = read-only
 * Operator = read / write operational data (leads, appointments, notes, follow-up, status)
 * Administrator = full management (all permissions including delete)
 */
export function canUserEditOperational(role?: UserRole): boolean {
  if (!role) return false;
  return role === 'Operator' || role === 'Administrator';
}

export function canUserManageSystem(role?: UserRole): boolean {
  if (!role) return false;
  return role === 'Administrator';
}

/**
 * Local cache getters (used for instant initial render before network completes)
 */
export function getCachedLeads(): B2BLead[] {
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return B2B_LEADS;
}

export function getCachedAppointments(): B2BAppointment[] {
  try {
    const raw = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return INITIAL_B2B_APPOINTMENTS;
}

/**
 * Real-time subscription to Central B2B Database (Shared across all users)
 */
export function subscribeCentralB2B(
  onUpdate: (data: { leads: B2BLead[]; appointments: B2BAppointment[] }) => void
): () => void {
  let isUnmounted = false;
  let currentLeads = getCachedLeads();
  let currentAppointments = getCachedAppointments();

  // 1. Immediately provide cached data for zero-latency rendering
  onUpdate({ leads: currentLeads, appointments: currentAppointments });

  // 2. Fetch and sync from central server
  const fetchServerB2B = async () => {
    try {
      const res = await fetch('/api/sync/b2b');
      const data = await res.json();
      if (!isUnmounted && data) {
        let changed = false;
        if (Array.isArray(data.leads) && data.leads.length > 0) {
          currentLeads = data.leads;
          localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(data.leads));
          changed = true;
        }
        if (Array.isArray(data.appointments) && data.appointments.length > 0) {
          currentAppointments = data.appointments;
          localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(data.appointments));
          changed = true;
        }
        if (changed) {
          onUpdate({ leads: currentLeads, appointments: currentAppointments });
        }
      }
    } catch (e) {
      // server sync error handled silently
    }
  };

  fetchServerB2B();

  // Periodic poll to ensure multi-user sync stays in lockstep
  const pollInterval = setInterval(fetchServerB2B, 10000);

  // 3. Firestore Real-time Listeners
  let unsubscribeLeads: (() => void) | null = null;
  let unsubscribeApts: (() => void) | null = null;

  try {
    const qLeads = query(collection(db, 'b2bLeads'), limit(300));
    unsubscribeLeads = onSnapshot(
      qLeads,
      (snapshot) => {
        if (isUnmounted) return;
        if (!snapshot.empty) {
          const remoteLeads: B2BLead[] = [];
          snapshot.forEach((doc) => {
            remoteLeads.push(doc.data() as B2BLead);
          });
          if (remoteLeads.length > 0) {
            currentLeads = remoteLeads;
            localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(remoteLeads));
            onUpdate({ leads: currentLeads, appointments: currentAppointments });
            // keep server in sync
            fetch('/api/sync/b2b', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ leads: currentLeads, appointments: currentAppointments }),
            }).catch(() => {});
          }
        }
      },
      () => {
        // Fallback to server sync if quota/rules limit reached
      }
    );
  } catch (e) {}

  try {
    const qApts = query(collection(db, 'b2bAppointments'), limit(300));
    unsubscribeApts = onSnapshot(
      qApts,
      (snapshot) => {
        if (isUnmounted) return;
        if (!snapshot.empty) {
          const remoteApts: B2BAppointment[] = [];
          snapshot.forEach((doc) => {
            remoteApts.push(doc.data() as B2BAppointment);
          });
          if (remoteApts.length > 0) {
            currentAppointments = remoteApts;
            localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(remoteApts));
            onUpdate({ leads: currentLeads, appointments: currentAppointments });
            // keep server in sync
            fetch('/api/sync/b2b', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ leads: currentLeads, appointments: currentAppointments }),
            }).catch(() => {});
          }
        }
      },
      () => {
        // Fallback to server sync
      }
    );
  } catch (e) {}

  return () => {
    isUnmounted = true;
    clearInterval(pollInterval);
    if (unsubscribeLeads) unsubscribeLeads();
    if (unsubscribeApts) unsubscribeApts();
  };
}

/**
 * Save or Update a B2B Lead (Requires Operator or Administrator role)
 */
export async function saveCentralB2BLead(
  lead: B2BLead,
  userRole?: UserRole
): Promise<{ success: boolean; error?: string }> {
  if (!canUserEditOperational(userRole)) {
    return {
      success: false,
      error: 'สิทธิ์ไม่เพียงพอ: เฉพาะตำแหน่ง Operator หรือ Administrator เท่านั้นที่สามารถแก้ไขข้อมูลลูกค้า B2B ได้',
    };
  }

  try {
    // 1. Update Firestore
    try {
      await setDoc(doc(db, 'b2bLeads', lead.id), lead);
    } catch (e) {
      console.warn('Firestore lead save warning:', e);
    }

    // 2. Update Central Server and Local Cache
    const leads = getCachedLeads();
    const idx = leads.findIndex((l) => l.id === lead.id);
    if (idx >= 0) {
      leads[idx] = lead;
    } else {
      leads.unshift(lead);
    }
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));

    const appointments = getCachedAppointments();
    await fetch('/api/sync/b2b', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads, appointments }),
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
  }
}

/**
 * Delete a B2B Lead (Requires Administrator role)
 */
export async function deleteCentralB2BLead(
  leadId: string,
  userRole?: UserRole
): Promise<{ success: boolean; error?: string }> {
  if (!canUserManageSystem(userRole)) {
    return {
      success: false,
      error: 'สิทธิ์ไม่เพียงพอ: เฉพาะ Administrator เท่านั้นที่สามารถลบข้อมูลลูกค้าออกจากฐานข้อมูลได้',
    };
  }

  try {
    try {
      await deleteDoc(doc(db, 'b2bLeads', leadId));
    } catch (e) {
      console.warn('Firestore lead delete warning:', e);
    }

    const leads = getCachedLeads().filter((l) => l.id !== leadId);
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));

    const appointments = getCachedAppointments();
    await fetch('/api/sync/b2b', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads, appointments }),
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการลบข้อมูล' };
  }
}

/**
 * Save or Update a B2B Appointment (Requires Operator or Administrator role)
 */
export async function saveCentralB2BAppointment(
  appointment: B2BAppointment,
  userRole?: UserRole
): Promise<{ success: boolean; error?: string }> {
  if (!canUserEditOperational(userRole)) {
    return {
      success: false,
      error: 'สิทธิ์ไม่เพียงพอ: เฉพาะตำแหน่ง Operator หรือ Administrator เท่านั้นที่สามารถนัดหมายและอัปเดตสถานะได้',
    };
  }

  try {
    try {
      await setDoc(doc(db, 'b2bAppointments', appointment.id), appointment);
    } catch (e) {
      console.warn('Firestore apt save warning:', e);
    }

    const appointments = getCachedAppointments();
    const idx = appointments.findIndex((a) => a.id === appointment.id);
    if (idx >= 0) {
      appointments[idx] = appointment;
    } else {
      appointments.unshift(appointment);
    }
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));

    const leads = getCachedLeads();
    await fetch('/api/sync/b2b', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads, appointments }),
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการบันทึกนัดหมาย' };
  }
}

/**
 * Delete a B2B Appointment (Requires Administrator role)
 */
export async function deleteCentralB2BAppointment(
  appointmentId: string,
  userRole?: UserRole
): Promise<{ success: boolean; error?: string }> {
  if (!canUserManageSystem(userRole)) {
    return {
      success: false,
      error: 'สิทธิ์ไม่เพียงพอ: เฉพาะ Administrator เท่านั้นที่สามารถลบนัดหมายได้',
    };
  }

  try {
    try {
      await deleteDoc(doc(db, 'b2bAppointments', appointmentId));
    } catch (e) {
      console.warn('Firestore apt delete warning:', e);
    }

    const appointments = getCachedAppointments().filter((a) => a.id !== appointmentId);
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));

    const leads = getCachedLeads();
    await fetch('/api/sync/b2b', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads, appointments }),
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการลบนัดหมาย' };
  }
}

/**
 * Reset B2B data to default initial directory (Admin only)
 */
export async function resetCentralB2BToDefault(
  userRole?: UserRole
): Promise<{ success: boolean; error?: string }> {
  if (!canUserManageSystem(userRole)) {
    return {
      success: false,
      error: 'สิทธิ์ไม่เพียงพอ: เฉพาะ Administrator เท่านั้นที่สามารถรีเซ็ตฐานข้อมูลได้',
    };
  }

  try {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(B2B_LEADS));
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(INITIAL_B2B_APPOINTMENTS));

    await fetch('/api/sync/b2b', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: B2B_LEADS, appointments: INITIAL_B2B_APPOINTMENTS }),
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการรีเซ็ตข้อมูล' };
  }
}
