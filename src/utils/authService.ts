import { sharedApi } from './sharedApi';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from './firebase';
import { AppUser, UserRole, UserStatus, UserActivityLog, UserActivityAction, StaffProfile, Department } from '../types';

const USERS_STORAGE_KEY = 'baanhome_app_users_v1';
const ACTIVITY_LOGS_STORAGE_KEY = 'baanhome_user_activity_logs_v1';
const ACTIVE_SESSION_KEY = 'baanhome_active_session_v1';

// Salt for client-side password hashing
const SALT = 'BaanHome_Secure_Salt_2026_!';

/**
 * Hash password with SHA-256 (Never store or display plaintext password)
 */
export async function hashPassword(plainText: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(SALT + plainText);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('Web Crypto unavailable, using fallback hash', e);
  }
  // Deterministic fallback hash if crypto.subtle is unavailable
  let hash = 0;
  const str = SALT + plainText;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'fash_' + Math.abs(hash).toString(16) + '_' + plainText.length;
}

export const INITIAL_DEFAULT_USERS: AppUser[] = [];

export const INITIAL_ACTIVITY_LOGS: UserActivityLog[] = [
  {
    id: 'act-init-1',
    userId: 'usr_admin',
    username: 'admin',
    staffName: 'คุณผู้จัดการศิริชัย (Admin)',
    role: 'Administrator',
    action: 'LOGIN',
    details: 'เข้าสู่ระบบจากคอมพิวเตอร์สำนักงานส่วนกลาง',
    timestamp: '2026-03-17 09:30:00',
  },
  {
    id: 'act-init-2',
    userId: 'usr_operator',
    username: 'operator',
    staffName: 'น้องพลอย ต้อนรับ (Operator)',
    role: 'Operator',
    action: 'SEARCH_QA',
    details: 'ค้นหาข้อมูล: สระว่ายน้ำเปิดกี่โมง ลึกเท่าไหร่',
    timestamp: '2026-03-17 09:20:00',
  },
  {
    id: 'act-init-3',
    userId: 'usr_kuser',
    username: 'kuser',
    staffName: 'คุณสมชาย บริการ (Knowledge User)',
    role: 'Knowledge User',
    action: 'VIEW_DOC',
    details: 'เปิดอ่านคู่มือ: อาหารและเครื่องดื่ม (F&B)',
    timestamp: '2026-03-17 08:50:00',
  },
];

// Helper to format Thai date
export function getFormattedTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Local Storage helpers
export function getLocalUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to get local users', e);
  }
  return [];
}

export function saveLocalUsers(users: AppUser[]) {
  try { if (localStorage.getItem(USERS_STORAGE_KEY + '_before_shared_db') === null) localStorage.setItem(USERS_STORAGE_KEY + '_before_shared_db', localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users)); } catch {}
}

export function getLocalActivityLogs(): UserActivityLog[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_LOGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to get local activity logs', e);
  }
  return INITIAL_ACTIVITY_LOGS;
}

export function saveLocalActivityLogs(logs: UserActivityLog[]) {
  try {
    localStorage.setItem(ACTIVITY_LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save local activity logs', e);
  }
}

export function getActiveSessionUser(): StaffProfile | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.username && parsed.role) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read active session', e);
  }
  return null;
}

export function setActiveSessionUser(user: StaffProfile | null) {
  try {
    if (user) {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      void sharedApi('/api/sync/users', { action: 'logout' }).catch(() => {});
    }
  } catch (e) {
    console.error('Failed to set active session', e);
  }
}

/**
 * Log user activity into Firestore & Local Cache
 */
export async function recordUserActivity(
  action: UserActivityAction,
  details: string,
  user: { id: string; username: string; name: string; role: string }
): Promise<void> {
  const timestamp = getFormattedTimestamp();
  const id = `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newLog: UserActivityLog = {
    id,
    userId: user.id || 'anonymous',
    username: user.username || 'unknown',
    staffName: user.name || 'เจ้าหน้าที่',
    role: user.role || 'Knowledge User',
    action,
    details,
    timestamp,
  };

  // 1. Update Local Cache immediately
  const existing = getLocalActivityLogs();
  const updated = [newLog, ...existing].slice(0, 300); // keep up to 300 logs
  saveLocalActivityLogs(updated);

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, 'userActivityLogs', id);
    await setDoc(docRef, {
      ...newLog,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore write for userActivityLog failed (operating in offline/cached mode)', err);
  }
}

/**
 * Subscribe to Activity Logs (Real-time Firestore with fallback)
 */
export function subscribeUserActivities(callback: (logs: UserActivityLog[]) => void): () => void {
  // Sync from shared server
  fetch('/api/sync/activities')
    .then((res) => res.json())
    .then((data) => {
      if (data && Array.isArray(data.activities) && data.activities.length > 0) {
        saveLocalActivityLogs(data.activities);
        callback(data.activities);
      }
    })
    .catch(() => {});

  try {
    const q = query(collection(db, 'userActivityLogs'), orderBy('createdAt', 'desc'), limit(150));
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const items = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: data.id || docSnap.id,
              userId: data.userId || '',
              username: data.username || '',
              staffName: data.staffName || '',
              role: data.role || 'Knowledge User',
              action: data.action || 'SEARCH_QA',
              details: data.details || '',
              timestamp: data.timestamp || '',
            } as UserActivityLog;
          });
          saveLocalActivityLogs(items);
          callback(items);
        } else {
          callback(getLocalActivityLogs());
        }
      },
      (error) => {
        console.warn('Subscription to userActivityLogs failed, using local cache', error);
        callback(getLocalActivityLogs());
      }
    );
  } catch (e) {
    console.warn('Error setting up activity log listener', e);
    callback(getLocalActivityLogs());
    return () => {};
  }
}

/**
 * Subscribe to Users (Real-time Firestore with fallback & Server Sync)
 */
async function fetchCentralUsers(): Promise<AppUser[]> {
  const data = await sharedApi('/api/sync/users');
  if (!Array.isArray(data.users)) throw new Error('ข้อมูลบัญชีส่วนกลางไม่ถูกต้อง');
  saveLocalUsers(data.users);
  return data.users;
}
export function subscribeUsers(callback: (users: AppUser[]) => void): () => void {
  let active = true, pending = false;
  const refresh = async () => {
    if (pending) return;
    pending = true;
    try { const users = await fetchCentralUsers(); if (active) callback(users); }
    catch (error) { console.warn('Central users unavailable', error); }
    finally { pending = false; }
  };
  void refresh();
  const timer = setInterval(refresh, 15000);
  window.addEventListener('baanhome-users-changed', refresh);
  return () => { active = false; clearInterval(timer); window.removeEventListener('baanhome-users-changed', refresh); };
}
// Existing accounts are never silently seeded or restored from browser data.
export async function initializeDefaultUsersIfNeeded(): Promise<void> {}
async function changeUser(action: string, id: string, changes?: unknown) {
  await sharedApi('/api/sync/users', { action, id, changes });
  window.dispatchEvent(new Event('baanhome-users-changed'));
}
export async function createNewUser(newUser: { username: string; name: string; department: Department; role: UserRole; plainPassword: string; avatar?: string }, actor: StaffProfile): Promise<AppUser> {
  const users = await fetchCentralUsers();
  const username = newUser.username.trim().toLowerCase();
  if (users.some(u => u.username.toLowerCase() === username)) throw new Error('ชื่อผู้ใช้นี้มีอยู่แล้ว');
  if (newUser.plainPassword.length < 6) throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
  const user = { id: 'usr_' + crypto.randomUUID(), username, name: newUser.name.trim(), department: newUser.department, role: newUser.role, status: 'active' as const, avatar: newUser.avatar || '👩🏻‍💼', passwordHash: await hashPassword(newUser.plainPassword), createdAt: getFormattedTimestamp() };
  const { id, ...changes } = user;
  await changeUser('create', id, changes);
  return { ...user, passwordHash: '' };
}
export async function updateUserRole(id: string, role: UserRole, actor: StaffProfile): Promise<void> { await changeUser('update', id, { role }); }
export async function toggleUserStatus(id: string, status: UserStatus, actor: StaffProfile): Promise<void> { await changeUser('update', id, { status }); }
export async function resetUserPassword(id: string, password: string, actor: StaffProfile): Promise<void> {
  if (password.length < 6) throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
  await changeUser('update', id, { passwordHash: await hashPassword(password), lastPasswordResetAt: getFormattedTimestamp() });
}
export async function updateUserProfile(id: string, updates: { name: string; department: Department; avatar?: string }, actor: StaffProfile): Promise<void> { await changeUser('update', id, updates); }
export async function batchUpdateUsersDepartment(oldDeptName: string, newDeptName: string, actor: StaffProfile): Promise<number> {
  const affected = (await fetchCentralUsers()).filter(u => u.department === oldDeptName);
  for (const user of affected) await changeUser('update', user.id, { department: newDeptName });
  return affected.length;
}
export async function deleteUser(id: string, actor: StaffProfile): Promise<void> { await changeUser('delete', id); }
export async function authenticateLogin(username: string, password: string): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  try {
    const result = await sharedApi('/api/sync/users', { action: 'login', username, password });
    setActiveSessionUser(result.user);
    window.dispatchEvent(new Event('baanhome-users-changed'));
    return { success: true, user: result.user };
  } catch (error: any) { return { success: false, error: error.message }; }
}


export const ROLE_PERMISSIONS: Record<
  UserRole,
  {
    name: string;
    description: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    allowedTabs: string[];
    canManageUsers: boolean;
    canViewSheetsHistory: boolean;
    canManageB2B: boolean;
    canManageUnanswered: boolean;
  }
> = {
  'Knowledge User': {
    name: 'Knowledge User (ผู้ใช้งานทั่วไป)',
    description: 'ค้นหาคำถาม-คำตอบ น้องโฮม, ศึกษาคู่มือ Google Docs, ดูแคตตาล็อกบริการ และส่งข้อเสนอแนะความถูกต้อง',
    badgeBg: 'bg-[#EAF5EC]',
    badgeText: 'text-[#1E6038]',
    badgeBorder: 'border-[#BFE3CA]',
    allowedTabs: ['qa', 'docs'],
    canManageUsers: false,
    canViewSheetsHistory: false,
    canManageB2B: false,
    canManageUnanswered: false,
  },
  Operator: {
    name: 'Operator (เจ้าหน้าที่ปฏิบัติการ / การขาย)',
    description: 'สิทธิ์ถาม-ตอบ + จัดการพันธมิตร B2B & องค์กร 101 แห่ง, ดูประวัติ Google Sheets, บันทึกการนัดหมาย และจัดการคิวคำถามที่ตอบไม่ได้',
    badgeBg: 'bg-[#EBF3FC]',
    badgeText: 'text-[#1E4E8C]',
    badgeBorder: 'border-[#BAD7F9]',
    allowedTabs: ['qa', 'b2b', 'docs', 'sheets', 'unanswered'],
    canManageUsers: false,
    canViewSheetsHistory: true,
    canManageB2B: true,
    canManageUnanswered: true,
  },
  Administrator: {
    name: 'Administrator (ผู้ดูแลระบบสูงสุด)',
    description: 'ควบคุมระบบทั้งหมด: เพิ่มบัญชี, กำหนดและสลับ Role, ปิดบัญชี, Reset Password, ดูประวัติ Audit Logs ผู้ใช้ทุกคน และตรวจสอบสถาปัตยกรรม',
    badgeBg: 'bg-[#FEF6E8]',
    badgeText: 'text-[#9A5B08]',
    badgeBorder: 'border-[#F8DCAB]',
    allowedTabs: ['qa', 'b2b', 'docs', 'sheets', 'unanswered', 'users', 'arch'],
    canManageUsers: true,
    canViewSheetsHistory: true,
    canManageB2B: true,
    canManageUnanswered: true,
  },
};

export function canUserAccessTab(role: UserRole, tabId: string): boolean {
  const config = ROLE_PERMISSIONS[role];
  if (!config) return false;
  return config.allowedTabs.includes(tabId);
}

/**
 * Export Users list to CSV (UTF-8 with BOM for Excel compatibility)
 */
export function exportUsersToCSV(users: AppUser[]): void {
  const headers = ['ลำดับ', 'Username', 'ชื่อ-สกุล', 'แผนก', 'ระดับสิทธิ์ (Role)', 'สถานะบัญชี', 'วันที่สร้าง', 'เข้าสู่ระบบล่าสุด'];
  const rows = users.map((u, idx) => [
    idx + 1,
    `"${u.username}"`,
    `"${u.name.replace(/"/g, '""')}"`,
    `"${u.department.replace(/"/g, '""')}"`,
    `"${u.role}"`,
    `"${u.status === 'active' ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'}"`,
    `"${u.createdAt || '-'}"`,
    `"${u.lastLoginAt || 'ยังไม่เคยเข้าใช้'}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `baanhome_users_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export User Activity Logs to CSV (UTF-8 with BOM for Excel compatibility)
 */
export function exportActivityLogsToCSV(logs: UserActivityLog[]): void {
  const headers = ['ลำดับ', 'วัน-เวลา', 'ชื่อผู้ใช้ (Username)', 'ชื่อพนักงาน', 'ระดับสิทธิ์', 'ประเภทกิจกรรม (Action)', 'รายละเอียด'];
  const rows = logs.map((l, idx) => [
    idx + 1,
    `"${l.timestamp}"`,
    `"${l.username}"`,
    `"${l.staffName.replace(/"/g, '""')}"`,
    `"${l.role}"`,
    `"${l.action}"`,
    `"${l.details.replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `baanhome_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
