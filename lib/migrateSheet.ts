import { collection, getDocs, getDoc, doc, setDoc } from 'firebase/firestore';
import { getDb } from '../api/_db.js';
import { readSheetData, writeSheetItem } from './sheetsStore.js';

// Explicit one-time migration. Never uses seed/demo data or overwrites a Sheet ID.
export async function migrateLegacySheet(preview: boolean) {
  const db = getDb();
  const marker = doc(db, 'systemConfig', 'sharedSheetMigrationV1');
  if ((await getDoc(marker)).exists()) return { alreadyImported: true, questions: 0, appointments: 0 };
  const [questions, unanswered, legacyQuestions, legacyB2b, appointments, existing] = await Promise.all([
    getDocs(collection(db, 'questionLogs')), getDocs(collection(db, 'unansweredQuestions')),
    getDoc(doc(db, 'systemConfig', 'questionLogs')), getDoc(doc(db, 'systemConfig', 'b2b')),
    getDocs(collection(db, 'b2bAppointments')), readSheetData(),
  ]);
  const merge = (sources: any[][], current: any[]) => {
    const known = new Set(current.map(x => x.id));
    const items = new Map<string, any>();
    // Individual persisted documents take precedence over older whole-list mirrors.
    for (const source of sources) for (const item of source) if (typeof item?.id === 'string' && !known.has(item.id)) items.set(item.id, item);
    return [...items.values()];
  };
  const oldLogs = legacyQuestions.data()?.payload;
  const oldAppointments = legacyB2b.data()?.payload?.appointments;
  const logs = merge([Array.isArray(oldLogs) ? oldLogs : [], questions.docs.map(d => ({ ...d.data(), id: d.id })), unanswered.docs.map(d => ({ ...d.data(), id: d.id, recordType: 'unanswered', found: false }))], existing.logs);
  const appts = merge([Array.isArray(oldAppointments) ? oldAppointments : [], appointments.docs.map(d => ({ ...d.data(), id: d.id }))], existing.appointments);
  if (!preview) {
    const batchLogs = logs.slice(0, 5);
    const batchAppts = appts.slice(0, Math.max(0, 5 - batchLogs.length));
    for (const item of batchLogs) await writeSheetItem('questions', item);
    for (const item of batchAppts) await writeSheetItem('appointments', item);
    const verified = await readSheetData();
    if (batchLogs.some(x => !verified.logs.some(y => x.id === y.id)) || batchAppts.some(x => !verified.appointments.some(y => x.id === y.id))) throw new Error('Migration could not be verified');
    const remaining = logs.length + appts.length - batchLogs.length - batchAppts.length;
    if (remaining === 0) await setDoc(marker, { completedAt: new Date().toISOString() });
    return { alreadyImported: remaining === 0, questions: batchLogs.length, appointments: batchAppts.length, remaining };
  }
  return { alreadyImported: false, questions: logs.length, appointments: appts.length };
}
