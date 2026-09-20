/** Bound Apps Script for the existing Baanhome spreadsheet.
 * Set APP_KEY in Project settings > Script properties, then deploy a new version.
 * Execute as owner. The web app is called only by the authenticated server.
 */
const SHARED_ID = '1sY0GAv6nCT_0gIM2qK91i76ZL5_VjoUBJPX0DGw5Bdg';
const TABLES = { questions: 'คำถามพนักงาน', appointments: 'การนัดหมาย B2B' };
function output_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function doGet() { return output_({ ok: false, error: 'Use authenticated POST' }); }
function doPost(e) {
  let lock;
  try {
    const request = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const key = PropertiesService.getScriptProperties().getProperty('APP_KEY');
    if (!key || request.key !== key) return output_({ ok: false, error: 'Unauthorized' });
    const action = request.action || 'read';
    if (!['read', 'upsert', 'delete'].includes(action)) throw new Error('Unsupported action');
    lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) throw new Error('Database busy; retry later');
    const book = SpreadsheetApp.openById(SHARED_ID);
    if (action === 'read') return output_({ ok: true, spreadsheetId: SHARED_ID, data: { questions: rows_(book, 'questions'), appointments: rows_(book, 'appointments') } });
    if (!Object.prototype.hasOwnProperty.call(TABLES, request.collection)) throw new Error('Invalid collection');
    const sheet = book.getSheetByName(TABLES[request.collection]);
    if (!sheet) throw new Error('Missing sheet');
    const id = action === 'upsert' ? request.row && request.row[0] : request.id;
    if (typeof id !== 'string' || !id.trim() || id.includes('รหัส')) throw new Error('Invalid ID');
    const matches = [];
    if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().forEach(function(row, i) { if (String(row[0]) === id) matches.push(i + 2); });
    if (action === 'delete') {
      matches.reverse().forEach(function(row) { sheet.deleteRow(row); });
      SpreadsheetApp.flush();
      return output_({ ok: true, id: id, deleted: matches.length > 0 });
    }
    const width = request.collection === 'questions' ? 13 : 16;
    if (!Array.isArray(request.row) || request.row.length !== width) throw new Error('Invalid column count');
    if (sheet.getMaxColumns() < width) sheet.insertColumnsAfter(sheet.getMaxColumns(), width - sheet.getMaxColumns());
    const values = request.row.map(function(value) {
      if (value == null) return '';
      if (!['string', 'number', 'boolean'].includes(typeof value)) throw new Error('Invalid cell value');
      return typeof value === 'string' && /^[=+@]/.test(value) ? "'" + value : value;
    });
    const destination = matches.length ? matches[0] : Math.max(2, sheet.getLastRow() + 1);
    if (destination > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), destination - sheet.getMaxRows());
    // Keep IDs, phone numbers, appointment dates and times as supplied strings.
    sheet.getRange(destination, 1).setNumberFormat('@');
    if (request.collection === 'appointments') {
      sheet.getRange(destination, 6).setNumberFormat('@');
      sheet.getRange(destination, 8, 1, 2).setNumberFormat('@');
      sheet.getRange(1, 15, 1, 2).setValues([['ชื่อนัดหมาย', 'ข้อมูลเชื่อมโยงระบบ']]);
    } else sheet.getRange(1, 12, 1, 2).setValues([['ประเภทคำถาม', 'สถานะติดตามระบบ']]);
    sheet.getRange(destination, 1, 1, width).setValues([values]);
    // Old append-only sync may have created duplicate IDs. Keep the updated row.
    matches.slice(1).reverse().forEach(function(row) { sheet.deleteRow(row); });
    SpreadsheetApp.flush();
    return output_({ ok: true, id: id, action: action });
  } catch (error) { return output_({ ok: false, error: error.message || String(error) }); }
  finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}
function rows_(book, name) {
  const sheet = book.getSheetByName(TABLES[name]);
  if (!sheet) throw new Error('Missing sheet ' + TABLES[name]);
  const rows = sheet.getDataRange().getValues();
  const timezone = book.getSpreadsheetTimeZone();
  const normalized = rows.map(function(row) { return row.map(function(value, col) {
    if (!(value instanceof Date)) return value;
    if (name === 'appointments' && col === 7) return Utilities.formatDate(value, timezone, 'yyyy-MM-dd');
    if (name === 'appointments' && col === 8) return Utilities.formatDate(value, timezone, 'HH:mm');
    return value.toISOString();
  }); });
  return { headers: normalized[0] || [], rows: normalized.slice(1).filter(function(row) { return String(row[0] || '').trim() !== ''; }) };
}
