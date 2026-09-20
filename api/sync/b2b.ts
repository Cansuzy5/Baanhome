import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { getDb, readLocalFallback, writeLocalFallback } from '../_db.js';
import { setCorsHeaders } from '../../lib/cors.js';
import { applyB2BMutation, type B2BData } from '../../lib/b2bMutation.js';

function initialData(): B2BData {
  return readLocalFallback<B2BData>('persistent_b2b.json', {
    leads: readLocalFallback<any[]>('persistent_b2b_leads.json', []),
    appointments: readLocalFallback<any[]>('persistent_b2b_appointments.json', []),
  });
}
function normalize(data: any): B2BData {
  return { leads: Array.isArray(data?.leads) ? data.leads : [], appointments: Array.isArray(data?.appointments) ? data.appointments : [] };
}
export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const database = getDb();
    if (!database) throw new Error('Database unavailable');
    const ref = doc(database, 'systemConfig', 'b2b');
    if (req.method === 'GET') {
      const snapshot = await getDoc(ref);
      const data = normalize(snapshot.exists() ? snapshot.data().payload : initialData());
      return res.status(200).json(data);
    }
    // Validate before starting the transaction.
    try { applyB2BMutation({ leads: [], appointments: [] }, req.body); }
    catch (error: any) { return res.status(400).json({ error: error.message }); }
    const updated = await runTransaction(database, async transaction => {
      const snapshot = await transaction.get(ref);
      const current = normalize(snapshot.exists() ? snapshot.data().payload : initialData());
      const next = applyB2BMutation(current, req.body);
      transaction.set(ref, { payload: next, updatedAt: new Date().toISOString() }, { merge: true });
      return next;
    });
    // Cache only after Firestore acknowledges the durable transaction.
    writeLocalFallback('persistent_b2b.json', updated);
    writeLocalFallback('persistent_b2b_leads.json', updated.leads);
    writeLocalFallback('persistent_b2b_appointments.json', updated.appointments);
    return res.status(200).json({ success: true, ...updated });
  } catch (error) {
    console.error('B2B persistence failed:', error);
    return res.status(503).json({ error: 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่ ข้อมูลยังไม่ได้รับการยืนยันว่าบันทึกแล้ว' });
  }
}
