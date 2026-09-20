import { setCorsHeaders } from '../../lib/cors.js';
import { requireSession, apiError } from '../../lib/sharedSession.js';
import { readSheetData, writeSheetItem, deleteSheetItem } from '../../lib/sheetsStore.js';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 'no-store');
  try {
    const actor = await requireSession(req);
    if (req.method === 'GET') return res.json({ logs: (await readSheetData()).logs });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { action, item, id } = req.body || {};
    if (action === 'delete') {
      if (actor.role !== 'Administrator') return res.status(403).json({ error: 'สิทธิ์ไม่เพียงพอ' });
      const result = await deleteSheetItem('questions', id);
      return res.json({ success: true, logs: result.logs });
    }
    if (action !== 'upsert' || typeof item?.question !== 'string') return res.status(400).json({ error: 'ข้อมูลคำถามไม่ถูกต้อง' });
    await writeSheetItem('questions', item);
    return res.json({ success: true, logs: (await readSheetData()).logs });
  } catch (error) { return apiError(res, error); }
}
