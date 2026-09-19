import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { DepartmentItem } from '../types';

const DEPARTMENTS_STORAGE_KEY = 'baanhome_departments_v1';

export const INITIAL_DEPARTMENTS: DepartmentItem[] = [
  {
    id: 'dept_fo',
    name: 'ต้อนรับส่วนหน้า (Front Office)',
    code: 'FO',
    description: 'งานต้อนรับ เช็คอิน-เช็คเอาท์ ให้ข้อมูลห้องพัก และดูแลความสะดวกผู้เข้าพัก',
    icon: '🏨',
    color: '#2D5A43',
    createdAt: '2026-03-01 08:00:00',
  },
  {
    id: 'dept_resv',
    name: 'สำรองห้องพัก (Reservation)',
    code: 'RESV',
    description: 'รับจองห้องพัก พูลวิลล่า บริหารจัดการห้องว่าง และประสานงาน OTA',
    icon: '📅',
    color: '#8E6728',
    createdAt: '2026-03-01 08:00:00',
  },
  {
    id: 'dept_fb',
    name: 'อาหารและเครื่องดื่ม (F&B)',
    code: 'FB',
    description: 'ครัวสวนอาหาร เมนู บริการโต๊ะ จัดเซ็ตอาหารเช้า และเครื่องดื่ม',
    icon: '🍲',
    color: '#24583D',
    createdAt: '2026-03-01 08:00:00',
  },
  {
    id: 'dept_hk',
    name: 'แม่บ้านและบริการห้องพัก (Housekeeping)',
    code: 'HK',
    description: 'ทำความสะอาดห้องพัก พูลวิลล่า ซักรีด และดูแลความสะอาดพื้นที่ส่วนกลาง',
    icon: '🧹',
    color: '#2D6B51',
    createdAt: '2026-03-01 08:00:00',
  },
  {
    id: 'dept_sales',
    name: 'ฝ่ายขายและการตลาด (Sales & MICE)',
    code: 'SALES',
    description: 'กลุ่มลูกค้าองค์กร สัมมนา งานเลี้ยง งานแต่งงาน และข้อตกลง B2B',
    icon: '💼',
    color: '#C89B3C',
    createdAt: '2026-03-01 08:00:00',
  },
  {
    id: 'dept_gr',
    name: 'ลูกค้าสัมพันธ์ (Guest Relations)',
    code: 'GR',
    description: 'ประสานงานลูกค้า VIP ดูแลข้อเสนอแนะ และสร้างความประทับใจ',
    icon: '🤝',
    color: '#964242',
    createdAt: '2026-03-01 08:00:00',
  },
  {
    id: 'dept_hr',
    name: 'ทรัพยากรบุคคล (HR)',
    code: 'HR',
    description: 'สรรหา ฝึกอบรมพนักงาน สวัสดิการ และการบริหารองค์กร',
    icon: '👥',
    color: '#435B4C',
    createdAt: '2026-03-01 08:00:00',
  },
  {
    id: 'dept_eng',
    name: 'ช่างและปฏิบัติการ (Engineering & Ops)',
    code: 'ENG',
    description: 'ซ่อมบำรุง ระบบสระว่ายน้ำ เครื่องปรับอากาศ ไฟฟ้า และสวน',
    icon: '🔧',
    color: '#3E5547',
    createdAt: '2026-03-01 08:00:00',
  },
];

/**
 * Get cached departments from localStorage
 */
export function getLocalDepartments(): DepartmentItem[] {
  try {
    const raw = localStorage.getItem(DEPARTMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load departments from cache', e);
  }
  return INITIAL_DEPARTMENTS;
}

/**
 * Save departments to localStorage
 */
export function saveLocalDepartments(departments: DepartmentItem[]): void {
  try {
    localStorage.setItem(DEPARTMENTS_STORAGE_KEY, JSON.stringify(departments));
  } catch (e) {
    console.warn('Failed to save departments to cache', e);
  }
  try {
    fetch('/api/sync/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ departments }),
    }).catch(() => {});
  } catch (e) {}
}

/**
 * Initialize default departments in Firestore if empty
 */
export async function initializeDepartmentsIfNeeded(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, 'departments'));
    if (snapshot.empty) {
      const batch = writeBatch(db);
      for (const dept of INITIAL_DEPARTMENTS) {
        const docRef = doc(db, 'departments', dept.id);
        batch.set(docRef, {
          ...dept,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      saveLocalDepartments(INITIAL_DEPARTMENTS);
    }
  } catch (err) {
    // Fallback to local storage if Firestore has permission/network delay
    const local = getLocalDepartments();
    if (!local || local.length === 0) {
      saveLocalDepartments(INITIAL_DEPARTMENTS);
    }
  }
}

/**
 * Real-time subscription to departments
 */
export function subscribeDepartments(callback: (departments: DepartmentItem[]) => void): () => void {
  // Sync from backend server store
  fetch('/api/sync/departments')
    .then((res) => res.json())
    .then((data) => {
      if (data && Array.isArray(data.departments) && data.departments.length > 0) {
        localStorage.setItem(DEPARTMENTS_STORAGE_KEY, JSON.stringify(data.departments));
        callback(data.departments);
      }
    })
    .catch(() => {});

  try {
    const q = query(collection(db, 'departments'), orderBy('name', 'asc'));
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const depts: DepartmentItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            depts.push({
              id: docSnap.id,
              name: data.name || '',
              code: data.code || '',
              description: data.description || '',
              icon: data.icon || '🏢',
              color: data.color || '#2D5A43',
              createdAt: data.createdAt ? String(data.createdAt) : '',
              updatedAt: data.updatedAt ? String(data.updatedAt) : '',
            });
          });
          saveLocalDepartments(depts);
          callback(depts);
        } else {
          const cached = getLocalDepartments();
          callback(cached.length > 0 ? cached : INITIAL_DEPARTMENTS);
        }
      },
      (err) => {
        console.warn('Firestore departments subscription error, using cached:', err);
        callback(getLocalDepartments());
      }
    );
  } catch (err) {
    console.warn('subscribeDepartments failed, falling back to local cache', err);
    callback(getLocalDepartments());
    return () => {};
  }
}

function syncWithTimeout(promise: Promise<unknown>, timeoutMs = 750): Promise<unknown> {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

/**
 * Add a new department
 */
export async function createDepartment(
  name: string,
  description?: string,
  code?: string
): Promise<{ success: boolean; error?: string; item?: DepartmentItem }> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: 'กรุณาระบุชื่อแผนก' };
  }

  const existing = getLocalDepartments();
  if (existing.some((d) => d.name.toLowerCase() === trimmedName.toLowerCase())) {
    return { success: false, error: 'ชื่อแผนกนี้มีอยู่ในระบบแล้ว' };
  }

  const id = `dept_${Date.now()}`;
  const newDept: DepartmentItem = {
    id,
    name: trimmedName,
    code: (code || trimmedName.slice(0, 4)).toUpperCase(),
    description: description?.trim() || '',
    icon: '🏢',
    color: '#2D5A43',
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };

  const updated = [...existing, newDept];
  saveLocalDepartments(updated);

  const syncTask = async () => {
    try {
      await setDoc(doc(db, 'departments', id), {
        ...newDept,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firestore add department error, persisted locally', e);
    }
  };

  await syncWithTimeout(syncTask(), 750);

  return { success: true, item: newDept };
}

/**
 * Edit / Rename a department
 */
export async function updateDepartment(
  id: string,
  newName: string,
  newDescription?: string,
  newCode?: string
): Promise<{ success: boolean; error?: string; oldName?: string }> {
  const trimmedName = newName.trim();
  if (!trimmedName) {
    return { success: false, error: 'กรุณาระบุชื่อแผนก' };
  }

  const existing = getLocalDepartments();
  const currentDept = existing.find((d) => d.id === id);
  if (!currentDept) {
    return { success: false, error: 'ไม่พบข้อมูลแผนกที่ต้องการแก้ไข' };
  }

  // Check duplicate name
  const duplicate = existing.find((d) => d.id !== id && d.name.toLowerCase() === trimmedName.toLowerCase());
  if (duplicate) {
    return { success: false, error: 'มีแผนกอื่นที่ใช้ชื่อนี้แล้ว' };
  }

  const oldName = currentDept.name;
  const updatedList = existing.map((d) =>
    d.id === id
      ? {
          ...d,
          name: trimmedName,
          description: newDescription !== undefined ? newDescription.trim() : d.description,
          code: newCode !== undefined ? newCode.trim().toUpperCase() : d.code,
          updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        }
      : d
  );

  saveLocalDepartments(updatedList);

  const syncTask = async () => {
    try {
      await updateDoc(doc(db, 'departments', id), {
        name: trimmedName,
        description: newDescription !== undefined ? newDescription.trim() : currentDept.description,
        code: newCode !== undefined ? newCode.trim().toUpperCase() : currentDept.code,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firestore update department error, saved locally', e);
    }
  };

  await syncWithTimeout(syncTask(), 750);

  return { success: true, oldName };
}

/**
 * Delete a department
 */
export async function deleteDepartment(
  id: string
): Promise<{ success: boolean; error?: string; deletedName?: string }> {
  const existing = getLocalDepartments();
  const currentDept = existing.find((d) => d.id === id);
  if (!currentDept) {
    return { success: false, error: 'ไม่พบข้อมูลแผนกที่ต้องการลบ' };
  }

  const deletedName = currentDept.name;
  const updatedList = existing.filter((d) => d.id !== id);
  saveLocalDepartments(updatedList);

  const syncTask = async () => {
    try {
      await deleteDoc(doc(db, 'departments', id));
    } catch (e) {
      console.warn('Firestore delete department error, deleted locally', e);
    }
  };

  await syncWithTimeout(syncTask(), 750);

  return { success: true, deletedName };
}

/**
 * Reset departments to default 8 departments
 */
export async function resetDepartmentsToDefault(): Promise<DepartmentItem[]> {
  saveLocalDepartments(INITIAL_DEPARTMENTS);
  try {
    const snapshot = await getDocs(collection(db, 'departments'));
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => batch.delete(docSnap.ref));
    for (const dept of INITIAL_DEPARTMENTS) {
      batch.set(doc(db, 'departments', dept.id), {
        ...dept,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (e) {
    console.warn('Firestore reset departments failed', e);
  }
  return INITIAL_DEPARTMENTS;
}

