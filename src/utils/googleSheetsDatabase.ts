import { QuestionLog, B2BAppointment } from '../types';

export interface GoogleSheetsDbConfig {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  autoSyncQuestions: boolean;
  autoSyncB2B: boolean;
  lastSyncedAt?: string;
  connectedEmail?: string;
}

const STORAGE_KEY = 'baanhome_google_sheets_db_config';

export const getStoredSheetsConfig = (): GoogleSheetsDbConfig | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse sheets config', e);
  }
  return null;
};

export const saveStoredSheetsConfig = (config: GoogleSheetsDbConfig | null): void => {
  if (!config) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
  
  // Trigger local event
  window.dispatchEvent(new CustomEvent('baanhome_sheets_config_updated', { detail: config }));

  // Central server synchronization for shared team access
  try {
    fetch('/api/sync/sheets-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    }).catch(() => {});
  } catch (e) {}
};

/**
 * Fetch and subscribe to central Google Sheets configuration across all users
 */
export function syncCentralSheetsConfig(onLoaded?: (config: GoogleSheetsDbConfig | null) => void): () => void {
  // Sync immediately from central server
  fetch('/api/sync/sheets-config')
    .then((res) => res.json())
    .then((data) => {
      if (data && 'config' in data) {
        if (data.config) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.config));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
        if (onLoaded) onLoaded(data.config);
      }
    })
    .catch(() => {});

  const listener = (event: Event) => {
    const custom = event as CustomEvent<GoogleSheetsDbConfig | null>;
    if (onLoaded) onLoaded(custom.detail);
  };
  window.addEventListener('baanhome_sheets_config_updated', listener);
  return () => window.removeEventListener('baanhome_sheets_config_updated', listener);
}

const QUESTION_HEADERS = [
  'รหัสคำถาม (Log ID)',
  'วัน-เวลา',
  'ชื่อพนักงานผู้ถาม',
  'แผนก',
  'คำถามที่ถามน้องโฮม',
  'สรุปคำตอบที่ระบบตอบ',
  'หมวดหมู่ความรู้',
  'แหล่งข้อมูลอ้างอิง (Google Docs)',
  'สถานะค้นพบในคู่มือ',
  'ผลประเมินความถูกต้อง (Feedback)',
  'บันทึกเพิ่มเติม',
];

const B2B_HEADERS = [
  'รหัสการนัด (ID)',
  'วัน-เวลาที่บันทึก',
  'ชื่อหน่วยงาน / องค์กรเป้าหมาย',
  'ระดับความสำคัญ (Priority)',
  'ชื่อผู้ติดต่อ',
  'เบอร์โทรศัพท์ / ข้อมูลติดต่อ',
  'วัตถุประสงค์การนัดหมาย',
  'วันนัดหมาย',
  'เวลานัดหมาย',
  'สถานที่นัด',
  'จำนวนผู้เข้าร่วมประมาณการ',
  'พนักงานผู้รับผิดชอบ',
  'สถานะการนัดหมาย',
  'หมายเหตุเพิ่มเติม',
];

/**
 * Creates a brand new Google Spreadsheet in the user's Google Drive with 2 formatted sheets:
 * 1. คำถามพนักงาน (Employee Questions)
 * 2. การนัดหมาย B2B (B2B Appointments)
 */
export async function createDatabaseSpreadsheet(
  accessToken: string,
  title: string = 'บ้านโฮม - ฐานข้อมูลคำถามพนักงาน & นัดหมาย B2B'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  const requestBody = {
    properties: {
      title,
      locale: 'th_TH',
    },
    sheets: [
      {
        properties: {
          title: 'คำถามพนักงาน',
          gridProperties: {
            frozenRowCount: 1,
            columnCount: 15,
          },
        },
      },
      {
        properties: {
          title: 'การนัดหมาย B2B',
          gridProperties: {
            frozenRowCount: 1,
            columnCount: 16,
          },
        },
      },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!createRes.ok) {
    const errJson = await createRes.json().catch(() => ({}));
    throw new Error(
      errJson.error?.message || `ไม่สามารถสร้าง Google Sheet ได้ (HTTP ${createRes.status})`
    );
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write header rows to both sheets
  await appendValuesToSheet(accessToken, spreadsheetId, 'คำถามพนักงาน!A1:K1', [QUESTION_HEADERS]);
  await appendValuesToSheet(accessToken, spreadsheetId, 'การนัดหมาย B2B!A1:N1', [B2B_HEADERS]);

  // Format header rows (Dark green theme for BanHome)
  try {
    const questionSheetId = sheetData.sheets?.[0]?.properties?.sheetId || 0;
    const b2bSheetId = sheetData.sheets?.[1]?.properties?.sheetId || 1;

    await formatSheetHeaders(accessToken, spreadsheetId, [
      { sheetId: questionSheetId, colCount: QUESTION_HEADERS.length },
      { sheetId: b2bSheetId, colCount: B2B_HEADERS.length },
    ]);
  } catch (fmtErr) {
    console.warn('Could not apply custom header formatting, but data is created:', fmtErr);
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
  };
}

/**
 * Format header rows with BanHome Forest Green style
 */
async function formatSheetHeaders(
  accessToken: string,
  spreadsheetId: string,
  sheets: Array<{ sheetId: number; colCount: number }>
) {
  const requests = sheets.map(({ sheetId, colCount }) => ({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: colCount,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: {
            red: 0.105,
            green: 0.239,
            blue: 0.184, // #1B3D2F
          },
          horizontalAlignment: 'CENTER',
          textFormat: {
            foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
            fontSize: 11,
            bold: true,
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
    },
  }));

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });
}

/**
 * Low-level append rows to a specific range in Google Sheets
 */
export async function appendValuesToSheet(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: (string | number | boolean)[][]
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `ไม่สามารถเขียนข้อมูลลง Sheets ได้ (HTTP ${res.status})`);
  }
}

/**
 * Format a QuestionLog into row values
 */
export function formatQuestionLogRow(log: QuestionLog): (string | number | boolean)[] {
  return [
    log.id,
    log.timestamp,
    log.staffName,
    log.department,
    log.question,
    log.answerSummary,
    log.category,
    log.sourceDoc,
    log.found ? 'พบคำตอบในคู่มือ' : 'ไม่พบคำตอบ (คิวคำถามตกค้าง)',
    log.feedback === 'accurate'
      ? 'ถูกต้อง'
      : log.feedback === 'incomplete'
      ? 'ตกหล่นบางส่วน'
      : log.feedback === 'incorrect'
      ? 'ไม่ถูกต้อง'
      : 'ยังไม่ประเมิน',
    log.feedbackNote || '',
  ];
}

/**
 * Format a B2BAppointment into row values
 */
export function formatAppointmentRow(apt: B2BAppointment): (string | number | boolean)[] {
  return [
    apt.id,
    apt.createdAt || new Date().toISOString(),
    apt.leadName,
    apt.priority || 'A',
    apt.contactPerson || '-',
    apt.phone || '-',
    apt.objective || apt.title,
    apt.date,
    apt.time,
    apt.location,
    apt.attendeesCount ? `${apt.attendeesCount} ท่าน` : '-',
    apt.assignedStaff || '-',
    apt.status === 'scheduled'
      ? 'รอดำเนินการ (Scheduled)'
      : apt.status === 'completed'
      ? 'เรียบร้อย (Completed)'
      : apt.status === 'rescheduled'
      ? 'เลื่อนนัด (Rescheduled)'
      : 'ยกเลิก (Cancelled)',
    apt.notes || '',
  ];
}

/**
 * Append single Question Log to connected sheet
 */
export async function appendQuestionLogToSheet(
  accessToken: string,
  spreadsheetId: string,
  log: QuestionLog
): Promise<void> {
  const row = formatQuestionLogRow(log);
  await appendValuesToSheet(accessToken, spreadsheetId, 'คำถามพนักงาน!A:K', [row]);
}

/**
 * Append single B2B Appointment to connected sheet
 */
export async function appendAppointmentToSheet(
  accessToken: string,
  spreadsheetId: string,
  apt: B2BAppointment
): Promise<void> {
  const row = formatAppointmentRow(apt);
  await appendValuesToSheet(accessToken, spreadsheetId, 'การนัดหมาย B2B!A:N', [row]);
}

/**
 * Bulk sync all question logs to Google Sheets
 */
export async function syncAllQuestionsToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  logs: QuestionLog[]
): Promise<number> {
  if (logs.length === 0) return 0;
  const rows = logs.map(formatQuestionLogRow);
  await appendValuesToSheet(accessToken, spreadsheetId, 'คำถามพนักงาน!A:K', rows);
  return logs.length;
}

/**
 * Bulk sync all B2B appointments to Google Sheets
 */
export async function syncAllAppointmentsToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  appointments: B2BAppointment[]
): Promise<number> {
  if (appointments.length === 0) return 0;
  const rows = appointments.map(formatAppointmentRow);
  await appendValuesToSheet(accessToken, spreadsheetId, 'การนัดหมาย B2B!A:N', rows);
  return appointments.length;
}

/**
 * Verify access and retrieve title of an existing Google Spreadsheet
 */
export async function verifySpreadsheetAccess(
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; sheetNames: string[] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `ไม่สามารถเข้าถึง Google Sheets นี้ได้ (HTTP ${res.status})`);
  }

  const data = await res.json();
  const sheetNames = (data.sheets || []).map((s: any) => s.properties?.title || '');
  return {
    title: data.properties?.title || 'Google Spreadsheet',
    sheetNames,
  };
}

/**
 * Extract clean spreadsheet ID from URL or raw ID
 */
export function extractSpreadsheetId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  // If user pasted just the ID (alphanumeric, dash, underscore, at least 15 chars)
  if (/^[a-zA-Z0-9-_]{15,}$/.test(trimmed)) return trimmed;
  return null;
}

/**
 * Export Question Logs as CSV for direct import to Google Sheets or Excel
 */
export function exportQuestionLogsToCSV(logs: QuestionLog[]): void {
  const headers = QUESTION_HEADERS.join(',');
  const rows = logs.map((log) => {
    const r = formatQuestionLogRow(log);
    return r.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',');
  });
  const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `ประวัติคำถามพนักงาน_บ้านโฮม_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export B2B Appointments as CSV for direct import to Google Sheets or Excel
 */
export function exportAppointmentsToCSV(appointments: B2BAppointment[]): void {
  const headers = B2B_HEADERS.join(',');
  const rows = appointments.map((apt) => {
    const r = formatAppointmentRow(apt);
    return r.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',');
  });
  const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `ตารางนัดหมาย_B2B_บ้านโฮม_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
