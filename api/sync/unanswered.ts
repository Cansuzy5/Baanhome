import { setCorsHeaders } from '../../lib/cors.js';
import { requireSession, apiError } from '../../lib/sharedSession.js';
import { readSheetData, writeSheetItem, deleteSheetItem } from '../../lib/sheetsStore.js';
export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 'no-store');
  try {
    const actor = await requireSession(req);
    if (req.method === 'GET') return res.json({ questions: (await readSheetData()).logs.filter(l => l.recordType === 'unanswered') });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { action, item, id } = req.body || {};
    if (action === 'delete') {
      if (actor.role !== 'Administrator') return res.status(403).json({ error: 'สิทธิ์ไม่เพียงพอ' });
      await deleteSheetItem('questions', id);
    } else if (action === 'upsert' && typeof item?.question === 'string') {
      await writeSheetItem('questions', { ...item, recordType: 'unanswered', found: false });
    } else return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง' });
    return res.json({ success: true, questions: (await readSheetData()).logs.filter(l => l.recordType === 'unanswered') });
  } catch (error) { return apiError(res, error); }
}
