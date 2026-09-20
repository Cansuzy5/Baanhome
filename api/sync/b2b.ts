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

  // Validate POST body before processing
  if (req.method === 'POST') {
    try {
      applyB2BMutation({ leads: [], appointments: [] }, req.body);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  try {
    const database = getDb();
    if (database) {
      const ref = doc(database, 'systemConfig', 'b2b');

      if (req.method === 'GET') {
        try {
          const snapshot = await getDoc(ref);
          if (snapshot.exists()) {
            const data = normalize(snapshot.data().payload);
            writeLocalFallback('persistent_b2b.json', data);
            writeLocalFallback('persistent_b2b_leads.json', data.leads);
            writeLocalFallback('persistent_b2b_appointments.json', data.appointments);
            return res.status(200).json(data);
          }
        } catch (readErr) {
          console.warn('Firestore B2B read failed, using fallback:', readErr);
        }
      }

      if (req.method === 'POST') {
        try {
          const updated = await runTransaction(database, async transaction => {
            const snapshot = await transaction.get(ref);
            const current = normalize(snapshot.exists() ? snapshot.data().payload : initialData());
            const next = applyB2BMutation(current, req.body);
            transaction.set(ref, { payload: next, updatedAt: new Date().toISOString() }, { merge: true });
            return next;
          });
          writeLocalFallback('persistent_b2b.json', updated);
          writeLocalFallback('persistent_b2b_leads.json', updated.leads);
          writeLocalFallback('persistent_b2b_appointments.json', updated.appointments);
          return res.status(200).json({ success: true, ...updated });
        } catch (txErr) {
          console.warn('Firestore B2B transaction failed, applying to local store:', txErr);
        }
      }
    }
  } catch (error) {
    console.warn('Firestore B2B error:', error);
  }

  // Graceful fallback to local persistence
  if (req.method === 'GET') {
    const data = initialData();
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const current = initialData();
    const updated = applyB2BMutation(current, req.body);
    writeLocalFallback('persistent_b2b.json', updated);
    writeLocalFallback('persistent_b2b_leads.json', updated.leads);
    writeLocalFallback('persistent_b2b_appointments.json', updated.appointments);
    return res.status(200).json({ success: true, ...updated });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
