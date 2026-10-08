// Run against an isolated Vite server. All external traffic and writes are mocked.
// Optional tools: npm install --no-save --package-lock=false playwright @sparticuz/chromium
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import { spawn } from 'node:child_process';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '3000'], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((resolve, reject) => { server.stdout.on('data', data => { if (String(data).includes('Local:')) resolve(); }); server.on('error', reject); server.on('exit', code => reject(new Error(`Vite exited ${code}`))); });
const executablePath = process.env.UI_CHROMIUM_PATH || '/tmp/baanhome-ui-chromium';
if (!process.env.UI_CHROMIUM_PATH) {
  writeFileSync(executablePath, brotliDecompressSync(readFileSync(new URL('../node_modules/@sparticuz/chromium/bin/chromium.br', import.meta.url))));
  chmodSync(executablePath, 0o755);
}
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'], headless: true });
const picture = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jrGQAAAAASUVORK5CYII=';
const item = { id: 'isolated-kb', title: 'อาหารทดสอบแยกจากข้อมูลจริง', category: 'restaurant', keywords: ['อาหาร'], summary: 'รายละเอียดภายใน', detail: ['เงื่อนไข'], customerMessage: 'คำตอบสำหรับลูกค้า', nextActions: [], sourceDoc: 'แหล่งอ้างอิงทดสอบ', lastUpdated: '2026-10-08', status: 'Published', dataStatus: 'Confirmed', aiUsable: 'Yes', audience: 'Both', images: [picture] };
const parts = new Map(), entries = {};
const today = new Date().toISOString().slice(0, 10);
const leads = [{ id: 'isolated-lead', name: 'องค์กรทดสอบ', priority: 'A', contactPerson: 'ผู้ติดต่อ', phone: '0000000000', pipelineStage: 'ยังไม่ติดต่อ', contactStatus: 'ยังไม่ติดต่อ', salesClosures: [] }];
const appointments = Array.from({ length: 7 }, (_, index) => ({ id: `isolated-appointment-${index}`, leadId: 'isolated-lead', leadName: 'องค์กรทดสอบ', date: today, time: `${10 + index}:00`, title: 'นัดทดสอบ', location: 'สถานที่ทดสอบ', objective: 'อื่นๆ', status: index === 0 ? 'completed' : 'scheduled', createdAt: `${today}T00:00:00Z`, ...(index === 0 ? { salesCycleOutcome: 'success', salesCycleClosureId: 'isolated-closure', salesCycleClosedAt: `${today}T09:00:00Z` } : {}) }));
let failSave = false;
const hash = value => createHash('sha256').update(value).digest('hex');
async function context(role, viewport) {
  const ctx = await browser.newContext({ viewport });
  await ctx.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    let json = {};
    if (url.pathname === '/api/sync/knowledge') json = { entries: {}, legacy: { items: [item], sheetUrl: '', lastSynced: '2026-10-08' } };
    if (url.pathname === '/api/sync/custom-images') {
      if (route.request().method() === 'GET') json = url.searchParams.has('part') ? { text: parts.get(url.searchParams.get('part')) } : { entries, legacy: {} };
      else {
        if (failSave) return route.fulfill({ status: 503, json: { error: 'ทดสอบบันทึกไม่สำเร็จ' } });
        const body = route.request().postDataJSON();
        if (body.action === 'stage') { const id = hash(body.text); parts.set(id, body.text); json = { id }; }
        else { const entry = { key: body.key, parts: body.parts, version: hash(JSON.stringify(body.parts)) }; entries[hash(body.key)] = entry; json = { success: true, entry }; }
      }
    }
    if (url.pathname === '/api/sync/b2b') json = { leads, appointments, success: true };
    await route.fulfill({ json });
  });
  await ctx.addInitScript(({ role, item, leads, appointments }) => {
    localStorage.setItem('baanhome_active_session_v1', JSON.stringify({ id: 'isolated-user', username: 'isolated-user', name: 'ผู้ทดสอบ', department: 'ทดสอบ', avatar: '', role, status: 'active' }));
    localStorage.setItem('nonghome_synced_knowledge_items', JSON.stringify([item]));
    localStorage.setItem('baan_home_b2b_leads_v2', JSON.stringify(leads));
    localStorage.setItem('baan_home_b2b_appointments_v2', JSON.stringify(appointments));
  }, { role, item, leads, appointments });
  return ctx;
}
async function fits(page) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'horizontal overflow'); }
try {
  const a = await context('Administrator', { width: 1440, height: 1000 });
  const b = await context('Operator', { width: 390, height: 844 });
  const page = await a.newPage(), other = await b.newPage();
  await Promise.all([page.goto('http://127.0.0.1:3000'), other.goto('http://127.0.0.1:3000')]);
  await page.getByRole('heading', { name: 'วันนี้ให้โฮมช่วยเรื่องไหน?' }).waitFor();
  await fits(page); await fits(other);
  await page.screenshot({ path: '/tmp/baanhome-qa-desktop.png', fullPage: true });
  await other.screenshot({ path: '/tmp/baanhome-qa-mobile.png', fullPage: true });
  assert.equal(await page.locator('#baanhome-navigation').count(), 0);
  await page.locator('#navigation-toggle').click();
  await page.locator('#baanhome-navigation').waitFor();
  await page.locator('#navigation-toggle').click();
  assert.equal(await page.locator('#baanhome-navigation').count(), 0);
  await page.locator('#navigation-toggle').click();
  await page.mouse.click(1000, 300);
  assert.equal(await page.locator('#baanhome-navigation').count(), 0);
  await page.locator('#navigation-toggle').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#baanhome-navigation').count(), 0);
  assert.equal(await page.locator('input[name="dataType"]').count(), 0);
  await page.locator('#main-search-input').fill('อาหาร');
  await page.getByRole('heading', { name: item.title }).waitFor();
  const card = page.locator('[data-knowledge-id="isolated-kb"]');
  const disclosure = card.locator('details').filter({ has: page.locator('summary', { hasText: 'ดูแหล่งอ้างอิงและข้อมูลเพิ่มเติม' }) });
  assert.equal(await disclosure.getAttribute('open'), null);
  await disclosure.locator('summary').click();
  await card.getByRole('button', { name: 'ดูรูปขนาดใหญ่' }).click();
  await page.locator('.fixed.inset-0.z-50.bg-black\\/90').waitFor();
  await page.locator('.fixed.inset-0.z-50.bg-black\\/90 button').last().click();
  await card.getByRole('button', { name: 'แก้ไขรูปภาพ', exact: true }).click();
  await page.getByRole('button', { name: /URL/ }).click();
  const urlInput = page.locator('input[type="url"], input[placeholder*="https"]');
  await urlInput.fill('https://example.invalid/new-image.png');
  await page.getByRole('button', { name: 'เพิ่มรูป', exact: true }).click();
  failSave = true;
  await page.getByRole('button', { name: 'บันทึกรูปภาพ', exact: true }).click();
  await page.getByText('ทดสอบบันทึกไม่สำเร็จ', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'บันทึกรูปภาพ', exact: true }).count(), 1);
  failSave = false;
  await page.getByRole('button', { name: 'บันทึกรูปภาพ', exact: true }).click();
  await page.getByRole('button', { name: 'บันทึกรูปภาพ', exact: true }).waitFor({ state: 'hidden' });
  await other.evaluate(() => window.dispatchEvent(new Event('focus')));
  await other.locator('img[src="https://example.invalid/new-image.png"]').waitFor();
  await other.getByRole('button', { name: 'แก้ไขรูปภาพ', exact: true }).click();
  await fits(other);
  assert.equal(await other.locator('img[src="https://example.invalid/new-image.png"]').count() > 0, true);
  await other.getByRole('button', { name: /ยกเลิก/ }).last().click();
  // Upload a real file through the existing input, then verify the other context.
  await card.getByRole('button', { name: 'แก้ไขรูปภาพ', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: 'isolated.png', mimeType: 'image/png', buffer: Buffer.from(picture.split(',')[1], 'base64') });
  await page.getByRole('button', { name: 'บันทึกรูปภาพ', exact: true }).click();
  await page.getByRole('button', { name: 'บันทึกรูปภาพ', exact: true }).waitFor({ state: 'hidden' });
  await other.evaluate(() => window.dispatchEvent(new Event('focus')));
  await other.getByText('มีรูปภาพ (3)', { exact: true }).waitFor();
  await card.getByRole('button', { name: 'แก้ไขรูปภาพ', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'คืนค่ารูปเดิม', exact: true }).click();
  await page.getByRole('button', { name: 'บันทึกรูปภาพ', exact: true }).waitFor({ state: 'hidden' });
  await other.evaluate(() => window.dispatchEvent(new Event('focus')));
  await other.getByText('มีรูปภาพ (1)', { exact: true }).waitFor();
  await card.getByRole('button', { name: 'แก้ไขรูปภาพ', exact: true }).click();
  await page.locator('button[title="ลบรูปนี้"]').click();
  await page.getByRole('button', { name: 'บันทึกรูปภาพ', exact: true }).click();
  await page.getByRole('button', { name: 'บันทึกรูปภาพ', exact: true }).waitFor({ state: 'hidden' });
  await other.evaluate(() => window.dispatchEvent(new Event('focus')));
  await other.getByRole('button', { name: 'เพิ่มรูปภาพ', exact: true }).waitFor();
  await card.getByRole('button', { name: 'เพิ่มรูปภาพ', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'คืนค่ารูปเดิม', exact: true }).click();
  await page.getByRole('button', { name: 'บันทึกรูปภาพ', exact: true }).waitFor({ state: 'hidden' });
  await other.evaluate(() => window.dispatchEvent(new Event('focus')));
  await other.getByRole('button', { name: 'แก้ไขรูปภาพ', exact: true }).waitFor();
  for (const p of [page, other]) {
    await p.locator('#navigation-toggle').click();
    await p.locator('#nav-tab-docs').click();
    await p.getByText('คลังความรู้บ้านโฮม · 14 หมวดหมู่').waitFor();
    await fits(p);
    await p.screenshot({ path: p === page ? '/tmp/baanhome-library.png' : '/tmp/baanhome-library-mobile.png', fullPage: true });
    await p.locator('#navigation-toggle').click();
    await p.locator('#nav-tab-b2b').click();
    await p.getByText(/รายชื่อลูกค้า \/ หน่วยงาน/).first().waitFor();
    await fits(p);
    await p.getByRole('button', { name: /ปฏิทินนัดหมาย \(/ }).click();
    await p.getByText('ปฏิทินนัดหมายเข้าพบ', { exact: true }).waitFor();
    await fits(p);
    assert.equal(await p.locator('.baanhome-calendar').count(), 1);
    await p.getByText('+ อีก 2 นัด', { exact: true }).waitFor();
    await p.getByText('ปิดดีลสำเร็จ', { exact: true }).first().waitFor();
    assert.equal(await p.getByText('สถานะติดตาม:', { exact: true }).count(), 0, 'scheduled and closed appointments must not show followup');
    assert.equal(await p.locator('button[title="ลบนัดหมาย"]').count() > 0, p === page, 'admin-only delete');
    await p.screenshot({ path: p === page ? '/tmp/baanhome-calendar.png' : '/tmp/baanhome-calendar-mobile.png', fullPage: true });
  }
  const userCtx = await context('Knowledge User', { width: 390, height: 844 });
  const user = await userCtx.newPage(); await user.goto('http://127.0.0.1:3000');
  await user.locator('#navigation-toggle').click();
  assert.equal(await user.locator('#nav-tab-b2b').count(), 0);
  assert.equal(await user.locator('#nav-tab-users-admin').count(), 0);
  await user.keyboard.press('Escape');
  await fits(user);
  console.log('PASS: desktop/mobile, menu, disclosures, lightbox, save errors, cross-context image refresh, knowledge/B2B/calendar views and role navigation');
} finally { await browser.close(); server.kill(); }
