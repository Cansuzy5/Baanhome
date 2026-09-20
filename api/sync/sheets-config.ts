import { setCorsHeaders } from '../../lib/cors.js';
import { requireSession, apiError } from '../../lib/sharedSession.js';
import { SHARED_SHEET_ID, readSheetData } from '../../lib/sheetsStore.js';
import { migrateLegacySheet } from '../../lib/migrateSheet.js';
export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 'no-store');
  try {
    const actor = await requireSession(req);
    if (req.method === 'POST' && ['preview-import', 'import-legacy'].includes(req.body?.action)) {
      if (actor.role !== 'Administrator') return res.status(403).json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
      return res.json({ success: true, migration: await migrateLegacySheet(req.body.action === 'preview-import') });
    }
    if (req.method !== 'GET') return res.status(405).json({ error: 'ฐานหลักกำหนดจากเซิร์ฟเวอร์' });
    const data = await readSheetData();
    return res.json({ config: { spreadsheetId: SHARED_SHEET_ID, spreadsheetTitle: 'บ้านโฮม - ฐานข้อมูลคำถามพนักงาน & นัดหมาย B2B', spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SHARED_SHEET_ID}/edit`, autoSyncQuestions: true, autoSyncB2B: true, lastSyncedAt: new Date().toISOString() }, questions: data.logs.length, appointments: data.appointments.length });
  } catch (error) { return apiError(res, error); }
}
