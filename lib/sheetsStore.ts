import { questionRow, readQuestion, appointmentRow, readAppointment } from './sheetRows.js';

export const SHARED_SHEET_ID = '1sY0GAv6nCT_0gIM2qK91i76ZL5_VjoUBJPX0DGw5Bdg';
export async function sheetRequest(body: Record<string, any>) {
  const url = process.env.GOOGLE_SHEETS_WEBAPP_URL;
  const key = process.env.GOOGLE_SHEETS_APP_KEY;
  if (!url || !key) throw new Error('Missing Google Sheets server configuration');
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url)) throw new Error('Invalid Apps Script URL');
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, redirect: 'follow', body: JSON.stringify({ ...body, key }), signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`Sheets gateway HTTP ${response.status}`);
  const data = await response.json();
  if (data.ok !== true) throw new Error(data.error || 'Sheets did not confirm the operation');
  return data;
}
export async function readSheetData() {
  const result = await sheetRequest({ action: 'read' });
  if (result.spreadsheetId !== SHARED_SHEET_ID) throw new Error('Sheet identity could not be verified. Deploy shared-sheet-webapp.gs first.');
  if (!Array.isArray(result.data?.questions?.rows) || !Array.isArray(result.data?.appointments?.rows)) throw new Error('Invalid sheet response');
  // Ignore header/blank rows, never replace a failed read with an empty dataset.
  const unique = (rows: any[][]) => {
    const ids = new Set<string>();
    return rows.filter(row => {
      const id = String(row[0] || '').trim();
      if (!id || id.includes('รหัส') || ids.has(id)) return false;
      ids.add(id); return true;
    });
  };
  return { logs: unique(result.data.questions.rows).map(readQuestion), appointments: unique(result.data.appointments.rows).map(readAppointment) };
}
export async function writeSheetItem(collection: 'questions' | 'appointments', item: any) {
  if (!item || typeof item.id !== 'string' || !item.id.trim()) throw Object.assign(new Error('ไม่พบรหัสรายการ'), { status: 400 });
  return sheetRequest({ action: 'upsert', collection, row: collection === 'questions' ? questionRow(item) : appointmentRow(item) });
}
export async function deleteSheetItem(collection: 'questions' | 'appointments', id: string) {
  if (typeof id !== 'string' || !id.trim()) throw Object.assign(new Error('ไม่พบรหัสรายการ'), { status: 400 });
  await sheetRequest({ action: 'delete', collection, id });
  const data = await readSheetData();
  const items = collection === 'questions' ? data.logs : data.appointments;
  if (items.some(item => item.id === id)) throw new Error('Sheet still contains the deleted ID');
  return data;
}
