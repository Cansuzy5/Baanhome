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
  where,
  getDocsFromServer,
  getDocFromServer,
  runTransaction,
  writeBatch
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
  throw new Error('เบราว์เซอร์ไม่รองรับการเข้ารหัส กรุณาเปิดผ่าน HTTPS');
}

// Pre-computed SHA-256 hashes for default accounts
// 'Admin@Baanhome2026'
export const DEFAULT_ADMIN_HASH = '9dbcd8e2eef014a070e1713d9657b98d287ef3e3d937107db71fb3426e0e2c81';
// 'Orartcandy1'
export const CANDY_PASSWORD_HASH = 'd93028673bae1ae8f8296bf87a2d05d9407ba69427da36d7a073e6e6c06c786d';
// 'Operator@2026'
export const DEFAULT_OPERATOR_HASH = 'e746a4e37f2a1b18129bbdd59336110f0ca97d83833d74c0c1bbff9e289bf631';
// 'User@2026'
export const DEFAULT_KUSER_HASH = '9099db88b201a082f4df6c5476a6d36e2f1e403d6594c34cb2e652a900350414';

export const INITIAL_DEFAULT_USERS: AppUser[] = [
  {
    id: 'usr_best',
    username: 'best',
    name: 'best',
    department: 'ช่างและปฏิบัติการ (Engineering & Operations)',
    role: 'Administrator',
    status: 'active',
    avatar: '🧑🏻‍💼',
    passwordHash: 'e32e70df43cf2288920a3555652178fc758c60a5e686e0615e95cb18df617c4e',
    createdAt: '2026-09-20 14:50:00',
    lastLoginAt: null,
  },
  {
    id: 'usr_candy',
    username: 'cansuzy3',
    name: 'Candy',
    department: 'ช่างและปฏิบัติการ (Engineering & Operations)',
    role: 'Administrator',
    status: 'active',
    avatar: '🧑🏻‍💼',
    passwordHash: CANDY_PASSWORD_HASH,
    createdAt: '2026-09-19 14:48:00',
    lastLoginAt: '2026-09-19 14:49:15',
  },
  {
    id: 'usr_admin',
    username: 'admin',
    name: 'คุณผู้จัดการศิริชัย (Admin)',
    department: 'ฝ่ายขายและการตลาด (Sales & MICE)',
    role: 'Administrator',
    status: 'active',
    avatar: '👨🏻‍💼',
    passwordHash: DEFAULT_ADMIN_HASH,
    createdAt: '2026-03-01 08:00:00',
    lastLoginAt: '2026-09-19 14:49:15',
  },
];

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
 try { const value=JSON.parse(localStorage.getItem(USERS_STORAGE_KEY)||'[]');return Array.isArray(value)?value:[]; } catch{return [];}
}
export function saveLocalUsers(users:AppUser[]) {
 try {localStorage.setItem(USERS_STORAGE_KEY,JSON.stringify(users));}catch{}
}
export async function refreshCentralUsers():Promise<AppUser[]> {
 const snapshot=await getDocsFromServer(collection(db,'appUsers'));
 const users=snapshot.docs.map(d=>({...d.data(),id:d.id} as AppUser));saveLocalUsers(users);return users;
}
function syncFailure(error:unknown) {
 console.error('Firestore sync failed',error);
 window.dispatchEvent(new CustomEvent('baanhome-sync-error',{detail:'เชื่อมต่อฐานข้อมูลกลางไม่ได้ ข้อมูลที่แสดงอาจยังไม่ล่าสุด กรุณาลองใหม่'}));
}
async function audit(action:UserActivityAction,details:string,actor:StaffProfile) {
 try {await recordUserActivity(action,details,actor);}catch(error){syncFailure(error);}
}
function requireAdmin(actor:StaffProfile) {if(actor.role!=='Administrator')throw new Error('สิทธิ์ไม่เพียงพอ');}
async function confirmed<T>(operation:Promise<T>):Promise<T> {
 let timer:ReturnType<typeof setTimeout>;
 try {return await Promise.race([operation,new Promise<T>((_,reject)=>{timer=setTimeout(()=>reject(new Error('การเชื่อมต่อใช้เวลานาน ยังยืนยันการบันทึกไม่ได้ กรุณารีเฟรชตรวจสอบก่อนลองอีกครั้ง')),15000);})]);}
 finally {clearTimeout(timer!);}
}
async function changeUser(id:string,updates:Partial<AppUser>,actor:StaffProfile,action:UserActivityAction) {
 requireAdmin(actor);
 if(id===actor.id && (updates.status==='inactive'||(updates.role&&updates.role!=='Administrator')))throw new Error('ไม่สามารถระงับหรือลดสิทธิ์บัญชีตนเองได้');
 await confirmed(updateDoc(doc(db,'appUsers',id),updates));
 void audit(action,`แก้ไขบัญชี ${id}`,actor);
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
export function subscribeUserActivities(callback:(logs:UserActivityLog[])=>void):()=>void {
 return onSnapshot(query(collection(db,'userActivityLogs'),orderBy('createdAt','desc'),limit(150)),{includeMetadataChanges:true},snapshot=>{
  if(snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites)return;
  const logs=snapshot.docs.map(d=>({...d.data(),id:d.id} as UserActivityLog));saveLocalActivityLogs(logs);callback(logs);
 },syncFailure);
}

/**
 * Subscribe to Users (Real-time Firestore with fallback & Server Sync)
 */
export function subscribeUsers(callback:(users:AppUser[])=>void):()=>void {
 return onSnapshot(collection(db,'appUsers'),{includeMetadataChanges:true},snapshot=>{
  if(snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites)return;
  const users=snapshot.docs.map(d=>({...d.data(),id:d.id} as AppUser));saveLocalUsers(users);callback(users);
 },syncFailure);
}
// Existing accounts must be preserved. Never resurrect default accounts on page load.
export async function initializeDefaultUsersIfNeeded():Promise<void> {}
export async function createNewUser(newUser:{username:string;name:string;department:Department;role:UserRole;plainPassword:string;avatar?:string},actor:StaffProfile):Promise<AppUser> {
 requireAdmin(actor);const username=newUser.username.trim().toLowerCase().replace(/^@/,'');
 if(!username||newUser.plainPassword.length<6)throw new Error('กรอกชื่อผู้ใช้และรหัสผ่านอย่างน้อย 6 ตัวอักษร');
 const existing=await getDocsFromServer(query(collection(db,'appUsers'),where('username','==',username)));
 if(!existing.empty)throw new Error('ชื่อผู้ใช้นี้มีอยู่แล้ว');
 const id='usr_'+await hashPassword('username:'+username);
 const user:AppUser={id,username,name:newUser.name.trim(),department:newUser.department,role:newUser.role,status:'active',avatar:newUser.avatar||'🧑🏻‍💼',passwordHash:await hashPassword(newUser.plainPassword),createdAt:getFormattedTimestamp()};
 await confirmed(runTransaction(db,async tx=>{const ref=doc(db,'appUsers',id);if((await tx.get(ref)).exists())throw new Error('ชื่อผู้ใช้นี้มีอยู่แล้ว');tx.set(ref,user);}));
 void audit('ADMIN_CREATE_USER',`เพิ่มบัญชี @${username}`,actor);return user;
}
export async function updateUserRole(id:string,role:UserRole,actor:StaffProfile):Promise<void>{await changeUser(id,{role},actor,'ADMIN_CHANGE_ROLE');}
export async function toggleUserStatus(id:string,status:UserStatus,actor:StaffProfile):Promise<void>{await changeUser(id,{status},actor,'ADMIN_TOGGLE_STATUS');}
export async function resetUserPassword(id:string,password:string,actor:StaffProfile):Promise<void>{
 if(password.length<6)throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
 await changeUser(id,{passwordHash:await hashPassword(password),lastPasswordResetAt:getFormattedTimestamp()},actor,'ADMIN_RESET_PASSWORD');
}
export async function updateUserProfile(id:string,updates:{name:string;department:Department;avatar?:string},actor:StaffProfile):Promise<void>{
 await changeUser(id,{name:updates.name.trim(),department:updates.department,...(updates.avatar?{avatar:updates.avatar}:{})},actor,'ADMIN_EDIT_USER');
}
export async function batchUpdateUsersDepartment(oldDeptName:string,newDeptName:string,actor:StaffProfile):Promise<number>{
 requireAdmin(actor);const snapshot=await getDocsFromServer(query(collection(db,'appUsers'),where('department','==',oldDeptName)));
 for(let i=0;i<snapshot.docs.length;i+=400){const batch=writeBatch(db);snapshot.docs.slice(i,i+400).forEach(d=>batch.update(d.ref,{department:newDeptName}));await confirmed(batch.commit());}
 void audit('ADMIN_EDIT_DEPT',`ย้ายแผนก ${snapshot.size} บัญชี`,actor);return snapshot.size;
}
export async function deleteUser(id:string,actor:StaffProfile):Promise<void>{
 requireAdmin(actor);if(id===actor.id)throw new Error('ไม่สามารถลบบัญชีตนเองได้');
 await confirmed(deleteDoc(doc(db,'appUsers',id)));void audit('ADMIN_DELETE_USER',`ลบบัญชี ${id}`,actor);
}
export async function authenticateLogin(usernameInput:string,plainPasswordInput:string):Promise<{success:boolean;user?:AppUser;error?:string}>{
 try {
  const username=usernameInput.trim().toLowerCase().replace(/^@/,'');
  const users=await refreshCentralUsers();const user=users.find(u=>u.username.toLowerCase()===username);
  if(!user)return {success:false,error:'ไม่พบบัญชีในฐานข้อมูลกลาง กรุณาติดต่อผู้ดูแลระบบ'};
  if(user.status!=='active')return {success:false,error:'บัญชีนี้ถูกระงับการใช้งาน'};
  if(user.passwordHash!==await hashPassword(plainPasswordInput))return {success:false,error:'รหัสผ่านไม่ถูกต้อง'};
  const timestamp=getFormattedTimestamp();await updateDoc(doc(db,'appUsers',user.id),{lastLoginAt:timestamp});
  const profile:StaffProfile={id:user.id,username:user.username,name:user.name,department:user.department,avatar:user.avatar,role:user.role,status:user.status,lastLoginAt:timestamp};
  setActiveSessionUser(profile);void audit('LOGIN','เข้าสู่ระบบ',profile);return {success:true,user:{...user,lastLoginAt:timestamp}};
 }catch(error){syncFailure(error);return {success:false,error:'เชื่อมต่อฐานข้อมูลกลางไม่ได้ กรุณาลองใหม่ ไม่ได้ตรวจสอบด้วยข้อมูลเก่าในเครื่อง'};}
}

/**
 * Role Permission Definition
 */
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

