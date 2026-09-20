import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const dir = await mkdtemp(resolve('.shared-test-'));
try {
  await build({ entryPoints: ['lib/sheetsStore.ts', 'lib/sheetRows.ts'], bundle: true, platform: 'node', format: 'esm', outdir: dir });
  const store = await import(pathToFileURL(resolve(dir, 'sheetsStore.js')));
  const rows = await import(pathToFileURL(resolve(dir, 'sheetRows.js')));
  const appointment = { id: 'test-1', createdAt: '2026-09-20', leadName: 'ทดสอบ', priority: 'A', contactPerson: 'ผู้ติดต่อ', phone: '0980000000', objective: 'อื่นๆ', date: '2026-09-21', time: '09:30', location: 'บ้านโฮม', attendeesCount: 0, assignedStaff: 'พนักงาน', status: 'scheduled', notes: '', title: 'นัดหมายทดสอบ', leadId: 'lead-1', updatedAt: '2026-09-20' };
  assert.deepEqual(rows.readAppointment(rows.appointmentRow(appointment)), appointment);
  const old = rows.appointmentRow(appointment); old[10] = '30 ท่าน'; old[12] = 'รอดำเนินการ (Scheduled)';
  assert.equal(rows.readAppointment(old).attendeesCount, 30);
  assert.equal(rows.readAppointment(old).status, 'scheduled');
  const question = rows.readQuestion(['q1','','','','test','','','','พบคำตอบในคู่มือ','ถูกต้อง']);
  assert.equal(question.found, true); assert.equal(question.feedback, 'accurate');
  delete process.env.GOOGLE_SHEETS_WEBAPP_URL;
  await assert.rejects(store.readSheetData(), /configuration/);
  process.env.GOOGLE_SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/test/exec';
  process.env.GOOGLE_SHEETS_APP_KEY = 'test-only';
  let appointments = [];
  let fail = false;
  globalThis.fetch = async (_url, options) => {
    if (fail) return { ok: true, json: async () => ({ ok: false, error: 'storage rejected' }) };
    const body = JSON.parse(options.body);
    assert.equal(body.key, 'test-only');
    assert.equal(options.redirect, 'follow');
    if (body.action === 'upsert') appointments = [...appointments.filter(x => x[0] !== body.row[0]), body.row];
    if (body.action === 'delete') appointments = appointments.filter(x => x[0] !== body.id);
    return { ok: true, json: async () => ({ ok: true, spreadsheetId: store.SHARED_SHEET_ID, data: { questions: { rows: [] }, appointments: { rows: appointments } } }) };
  };
  await store.writeSheetItem('appointments', appointment);
  await store.writeSheetItem('appointments', { ...appointment, title: 'แก้ไข' });
  assert.equal((await store.readSheetData()).appointments.length, 1);
  assert.equal((await store.readSheetData()).appointments[0].title, 'แก้ไข');
  assert.equal((await store.deleteSheetItem('appointments', appointment.id)).appointments.length, 0);
  assert.equal((await store.readSheetData()).appointments.length, 0, 'deleted last record must stay empty');
  fail = true;
  await assert.rejects(store.writeSheetItem('appointments', appointment), /storage rejected/);
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ ok: true, spreadsheetId: 'wrong-sheet' }) });
  await assert.rejects(store.readSheetData(), /identity/);
  console.log('PASS: row round trips, legacy values, idempotent upsert, shared read, delete-last, failed writes, wrong-sheet protection');
} finally { await rm(dir, { recursive: true, force: true }); }
