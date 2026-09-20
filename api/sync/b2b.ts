import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { getDb, readLocalFallback, writeLocalFallback } from '../_db.js';
import { setCorsHeaders } from '../../lib/cors.js';
import { applyB2BMutation, type B2BData } from '../../lib/b2bMutation.js';
import { requireSession, apiError } from '../../lib/sharedSession.js';
import { readSheetData, writeSheetItem, deleteSheetItem } from '../../lib/sheetsStore.js';

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
    res.setHeader('Cache-Control', 'no-store');
    const actor = await requireSession(req);
    const database = getDb();
    if (!database) throw new Error('Database unavailable');
    const ref = doc(database, 'systemConfig', 'b2b');
    if (req.method === 'GET') {
      const snapshot = await getDoc(ref);
      const data = normalize(snapshot.exists() ? snapshot.data().payload : initialData());
      return res.status(200).json({ leads: data.leads, appointments: (await readSheetData()).appointments });
    }
    if (req.body?.collection === 'appointments') {
      const roles = req.body.action === 'delete' ? ['Administrator'] : ['Administrator', 'Operator'];
      if (!roles.includes(actor.role)) return res.status(403).json({ error: 'สิทธิ์ไม่เพียงพอ' });
      if (req.body.action === 'delete') await deleteSheetItem('appointments', req.body.id);
      else if (req.body.action === 'upsert') await writeSheetItem('appointments', req.body.item);
      else return res.status(400).json({ error: 'คำสั่งไม่ถูกต้อง' });
      const snapshot = await getDoc(ref);
      return res.json({ success: true, leads: normalize(snapshot.exists() ? snapshot.data().payload : initialData()).leads, appointments: (await readSheetData()).appointments });
    }
    if (req.body?.collection !== 'leads' || !['upsert', 'delete'].includes(req.body?.action)) return res.status(400).json({ error: 'ไม่อนุญาตให้เขียนทับข้อมูลทั้งชุด' });
    if (!(req.body.action === 'delete' ? ['Administrator'] : ['Administrator', 'Operator']).includes(actor.role)) return res.status(403).json({ error: 'สิทธิ์ไม่เพียงพอ' });
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
    return res.status(200).json({ success: true, leads: updated.leads, appointments: (await readSheetData()).appointments });
  } catch (error) {
    console.error('B2B persistence failed:', error);
    return apiError(res, error);
  }
}
