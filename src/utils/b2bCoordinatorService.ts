import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { B2BCoordinator, UserRole } from '../types';

const CONFIG_REF = () => doc(db, 'systemConfig', 'b2bCoordinators');

function canManage(role?: UserRole) {
  return role === 'Operator' || role === 'Administrator';
}

export function subscribeB2BCoordinators(callback: (items: B2BCoordinator[]) => void): () => void {
  return onSnapshot(
    CONFIG_REF(),
    (snapshot) => {
      const items = snapshot.exists() && Array.isArray(snapshot.data()?.items)
        ? snapshot.data().items as B2BCoordinator[]
        : [];
      callback([...items].sort((a,b)=>a.name.localeCompare(b.name,'th')));
    },
    (error) => {
      console.warn('Unable to subscribe B2B coordinators', error);
      callback([]);
    }
  );
}

async function loadItems(): Promise<B2BCoordinator[]> {
  const snapshot = await getDoc(CONFIG_REF());
  return snapshot.exists() && Array.isArray(snapshot.data()?.items)
    ? snapshot.data().items as B2BCoordinator[]
    : [];
}

export async function saveB2BCoordinator(
  item: Omit<B2BCoordinator, 'createdAt'> & { createdAt?: string },
  role?: UserRole
): Promise<void> {
  if (!canManage(role)) throw new Error('สิทธิ์ไม่เพียงพอสำหรับจัดการรายชื่อผู้ประสานงานบ้านโฮม');

  const now = new Date().toISOString();
  const current = await loadItems();
  const id = item.id || `bhc_${Date.now()}`;
  const payload: B2BCoordinator = {
    id,
    name: item.name.trim(),
    phone: item.phone?.trim() || '',
    active: item.active !== false,
    createdAt: item.createdAt || now,
    updatedAt: now,
  };

  const next = [payload, ...current.filter((x)=>x.id!==id)];
  await setDoc(CONFIG_REF(), { items: next, updatedAt: now }, { merge: true });
}

export async function setB2BCoordinatorActive(
  id: string,
  active: boolean,
  role?: UserRole
): Promise<void> {
  if (!canManage(role)) throw new Error('สิทธิ์ไม่เพียงพอสำหรับจัดการรายชื่อผู้ประสานงานบ้านโฮม');
  const now = new Date().toISOString();
  const current = await loadItems();
  const next = current.map((item)=>item.id===id ? { ...item, active, updatedAt: now } : item);
  await setDoc(CONFIG_REF(), { items: next, updatedAt: now }, { merge: true });
}
