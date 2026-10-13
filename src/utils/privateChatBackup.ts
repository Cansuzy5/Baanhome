import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, runTransaction, serverTimestamp, Timestamp, terminate } from 'firebase/firestore';
import config from '../../firebase-applet-config.json';
import { chatPayload } from './privateChatPayload';
import type { ConversationTurn } from './qaConversation';
// Dedicated, ephemeral Auth instance: never replaces the existing app login.
export function createPrivateChatBackup() {
  const app = initializeApp(config, `chat-backup-${crypto.randomUUID()}`);
  const auth = initializeAuth(app, { persistence: inMemoryPersistence });
  const db = getFirestore(app, config.firestoreDatabaseId || '(default)');
  let version: string | null | undefined;
  let disposed = false;
  const ref = () => {
    if (disposed || !auth.currentUser) throw new Error('กรุณาเข้าสู่ระบบสำรองแชท');
    return doc(db, 'privateChatBackups', auth.currentUser.uid);
  };
  return {
    async login(email: string, password: string) {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      if (disposed) { await signOut(auth); throw new Error('ปิดหน้าสำรองแล้ว'); }
      return credential.user.email || email;
    },
    async load(): Promise<ConversationTurn[]> {
      const snap = await getDocFromServer(ref());
      version = snap.exists() ? snap.data().version : null;
      if (!snap.exists()) return [];
      if (typeof version !== 'string' || typeof snap.data().payload !== 'string') throw new Error('ข้อมูลสำรองไม่ถูกต้อง');
      if (snap.data().expiresAt?.toMillis() <= Date.now()) return [];
      return JSON.parse(chatPayload(JSON.parse(snap.data().payload)));
    },
    async save(turns: ConversationTurn[]) {
      if (version === undefined) throw new Error('กรุณาโหลดข้อมูลกลางก่อนบันทึก');
      const payload = chatPayload(turns), target = ref(), next = crypto.randomUUID();
      await runTransaction(db, async tx => {
        const snap = await tx.get(target);
        if ((snap.exists() ? snap.data().version : null) !== version) throw new Error('มีการเปลี่ยนข้อมูลจากอีกเครื่อง กรุณาปิดแล้วเปิดหน้าสำรองใหม่ก่อน');
        tx.set(target, { version: next, payload, updatedAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 30 * 86400000) });
      });
      version = next;
    },
    async remove() {
      if (version === undefined) throw new Error('กรุณาโหลดข้อมูลกลางก่อนลบ');
      const target = ref();
      await runTransaction(db, async tx => {
        const snap = await tx.get(target);
        if ((snap.exists() ? snap.data().version : null) !== version) throw new Error('มีข้อมูลจากอีกเครื่อง กรุณาเปิดหน้าสำรองใหม่');
        tx.delete(target);
      });
      version = null;
    },
    async close() { disposed = true; await signOut(auth).catch(() => {}); await terminate(db).catch(() => {}); await deleteApp(app); },
  };
}
