import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { B2BCoordinator, UserRole } from '../types';

export function subscribeB2BCoordinators(callback: (items: B2BCoordinator[]) => void): () => void {
  const q = query(collection(db, 'b2bCoordinators'), orderBy('name'));
  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs.map((snap) => {
          const data = snap.data();
          return {
            id: snap.id,
            name: data.name || '',
            phone: data.phone || '',
            active: data.active !== false,
            createdAt: data.createdAt || '',
            updatedAt: data.updatedAt || '',
          } as B2BCoordinator;
        })
      );
    },
    (error) => {
      console.warn('Unable to subscribe B2B coordinators', error);
      callback([]);
    }
  );
}

function canManage(role?: UserRole) {
  return role === 'Operator' || role === 'Administrator';
}

export async function saveB2BCoordinator(
  item: Omit<B2BCoordinator, 'createdAt'> & { createdAt?: string },
  role?: UserRole
): Promise<void> {
  if (!canManage(role)) throw new Error('สิทธิ์ไม่เพียงพอสำหรับจัดการรายชื่อผู้ประสานงานบ้านโฮม');

  const now = new Date().toISOString();
  const id = item.id || `bhc_${Date.now()}`;
  const payload: B2BCoordinator = {
    id,
    name: item.name.trim(),
    phone: item.phone?.trim() || '',
    active: item.active !== false,
    createdAt: item.createdAt || now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'b2bCoordinators', id), payload, { merge: true });
}

export async function setB2BCoordinatorActive(
  id: string,
  active: boolean,
  role?: UserRole
): Promise<void> {
  if (!canManage(role)) throw new Error('สิทธิ์ไม่เพียงพอสำหรับจัดการรายชื่อผู้ประสานงานบ้านโฮม');
  await updateDoc(doc(db, 'b2bCoordinators', id), {
    active,
    updatedAt: new Date().toISOString(),
  });
}
