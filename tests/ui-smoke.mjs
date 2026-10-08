// Run against an isolated Vite server. All external traffic and writes are mocked.
// Optional tools: npm install --no-save --package-lock=false playwright @sparticuz/chromium
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, chmodSync, existsSync } from 'node:fs';
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
const menuItem = { ...item, id: 'isolated-menu', title: 'ต้มยำกุ้งทดสอบแยกจากข้อมูลจริง', keywords: ['ต้มยำกุ้ง'], images: [], customerMessage: 'เมนูทดสอบ ไม่ใช่ข้อมูลร้านจริง' };
const parts = new Map(), entries = {}, knowledgeEntries = {};
const today = new Date().toISOString().slice(0, 10);
const leads = [{ id: 'isolated-lead', name: 'องค์กรทดสอบ', priority: 'A', contactPerson: 'ผู้ติดต่อ', phone: '0000000000', pipelineStage: 'ยังไม่ติดต่อ', contactStatus: 'ยังไม่ติดต่อ', salesClosures: [] }];
const appointments = Array.from({ length: 7 }, (_, index) => ({ id: `isolated-appointment-${index}`, leadId: 'isolated-lead', leadName: 'องค์กรทดสอบ', date: today, time: `${10 + index}:00`, title: 'นัดทดสอบ', location: 'สถานที่ทดสอบ', objective: 'อื่นๆ', status: index === 0 ? 'completed' : 'scheduled', createdAt: `${today}T00:00:00Z`, ...(index === 0 ? { salesCycleOutcome: 'success', salesCycleClosureId: 'isolated-closure', salesCycleClosedAt: `${today}T09:00:00Z` } : {}) }));
let failSave = false;
let failAi = false;
const aiCalls = [];
const hash = value => createHash('sha256').update(value).digest('hex');
async function context(role, viewport, accountId = role) {
  const ctx = await browser.newContext({ viewport });
  await ctx.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'example.invalid') return route.fulfill({ contentType: 'image/png', body: Buffer.from(picture.split(',')[1], 'base64') });
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    let json = {};
    if (url.pathname === '/api/sync/knowledge') {
      if (route.request().method() === 'GET') json = url.searchParams.has('part') ? { text: parts.get(url.searchParams.get('part')) } : { entries: knowledgeEntries, legacy: { items: [item, menuItem], sheetUrl: '', lastSynced: '2026-10-08' } };
      else {
        if (failSave) return route.fulfill({ status: 503, json: { error: 'ทดสอบบันทึกไม่สำเร็จ' } });
        const body = route.request().postDataJSON();
        if (body.action === 'stage') { const id = hash(body.text); parts.set(id, body.text); json = { id }; }
        else { const entry = { key: body.key, parts: body.parts, version: hash(JSON.stringify(body.parts)) }; knowledgeEntries[hash(body.key)] = entry; json = { success: true, entry }; }
      }
    }
    if (url.pathname === '/api/ask') {
      const request = route.request().postDataJSON(); aiCalls.push(request);
      if (failAi) return route.fulfill({ status: 502, json: { error: 'AI ทดสอบขัดข้อง' } });
      const id = request.query.includes('ต้มยำ') || request.history?.some(t => t.question.includes('ต้มยำ')) ? menuItem.id : item.id;
      json = { customerAnswer: 'คำตอบ AI ทดสอบ', staffAnswer: request.query.includes('ทั้งสอง') ? 'ข้อมูลภายในทดสอบ' : '', referenceIds: [id], customerReferenceIds: [id] };
    }
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
  await ctx.addInitScript(({ role, item, menuItem, leads, appointments, accountId }) => {
    localStorage.setItem('baanhome_active_session_v1', JSON.stringify({ id: accountId, username: accountId, name: 'ผู้ทดสอบ', department: 'ทดสอบ', avatar: '', role, status: 'active' }));
    localStorage.setItem('nonghome_synced_knowledge_items', JSON.stringify([item, menuItem]));
    localStorage.setItem('baan_home_b2b_leads_v2', JSON.stringify(leads));
    localStorage.setItem('baan_home_b2b_appointments_v2', JSON.stringify(appointments));
  }, { role, item, menuItem, leads, appointments, accountId });
  if (process.env.UI_FONT_PATH && existsSync(process.env.UI_FONT_PATH)) {
    const font = readFileSync(process.env.UI_FONT_PATH).toString('base64');
    await ctx.addInitScript(font => {
      document.addEventListener('DOMContentLoaded', () => { const style = document.createElement('style'); style.textContent = `@font-face{font-family:UITestThai;src:url(data:font/ttf;base64,${font})}body,h1,h2,h3,h4,h5,h6{font-family:UITestThai,sans-serif!important}`; document.head.append(style); });
    }, font);
  }
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
  assert.equal(await page.locator('.qa-botanical-backdrop').evaluate(el => getComputedStyle(el).pointerEvents), 'none');
  await page.locator('#main-search-input').fill(item.title);
  await page.getByRole('button', { name: 'ส่งคำถาม', exact: true }).click();
  await other.locator('#main-search-input').fill(item.title);
  await other.getByRole('button', { name: 'ส่งคำถาม', exact: true }).click();
  await page.getByText('คำตอบ AI ทดสอบ', { exact: true }).waitFor();
  await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); });
  for (const screen of [page, other]) {
    await screen.locator('.qa-answer-bubble').waitFor();
    assert.equal(await screen.locator('.qa-assistant-signature').evaluate(el => el.getBoundingClientRect().top >= el.parentElement.getBoundingClientRect().top), true, 'assistant signature stays inside answer border');
    assert.equal(await screen.locator('.qa-composer').evaluate(el => getComputedStyle(el).position), 'relative');
  }
  await page.screenshot({ path: '/tmp/baanhome-qa-answer.png', fullPage: true });
  await page.getByText('คำตอบ AI ทดสอบ', { exact: true }).waitFor();
  const card = page.locator('[data-knowledge-id="isolated-kb"]');
  const disclosure = page.locator('details').filter({ has: page.locator('summary', { hasText: 'แหล่งอ้างอิงและข้อมูลเพิ่มเติม' }) });
  assert.equal(await disclosure.getAttribute('open'), null);
  await disclosure.locator('summary').click();
  await card.getByRole('button', { name: `ดูรูป ${item.title}`, exact: true }).click();
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
  await other.waitForFunction(() => document.querySelector('[data-knowledge-id="isolated-kb"]').querySelectorAll('img').length === 3);
  await card.getByRole('button', { name: 'แก้ไขรูปภาพ', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'คืนค่ารูปเดิม', exact: true }).click();
  await page.getByRole('button', { name: 'บันทึกรูปภาพ', exact: true }).waitFor({ state: 'hidden' });
  await other.evaluate(() => window.dispatchEvent(new Event('focus')));
  await other.waitForFunction(() => document.querySelector('[data-knowledge-id="isolated-kb"]').querySelectorAll('img').length === 1);
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
    await p.getByRole('heading', { name: 'คลังความรู้', exact: true }).waitFor();
    const callsBeforeRead = aiCalls.length;
    await p.getByRole('button', { name: 'เปิดอ่าน สวนอาหารและเมนู', exact: true }).click();
    await p.getByRole('heading', { name: item.title, exact: true }).waitFor();
    await p.locator('[data-reader-item="isolated-kb"]').getByText(item.summary, { exact: true }).waitFor();
    await p.getByRole('heading', { name: menuItem.title, exact: true }).waitFor();
    assert.equal(await p.locator('[data-reader-item]').count() >= 2, true, 'whole category is readable without opening individual records');
    await p.getByRole('navigation', { name: 'สารบัญหมวดความรู้' }).getByRole('link', { name: item.title, exact: true }).click();
    assert.equal(await p.locator('#main-search-input').count(), 0, 'reading stays in library');
    assert.equal(aiCalls.length, callsBeforeRead, 'reading never calls AI');
    await fits(p);
    await p.screenshot({ path: p === page ? '/tmp/baanhome-library.png' : '/tmp/baanhome-library-mobile.png', fullPage: false });
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
  for (const p of [page, other]) {
    await p.locator('#navigation-toggle').click();
    await p.locator('#nav-tab-qa').click();
    await p.getByRole('button', { name: 'เริ่มบทสนทนาใหม่' }).click();
    await p.locator('#main-search-input').fill(menuItem.title);
    await p.getByRole('button', { name: 'ส่งคำถาม', exact: true }).click();
    await p.locator('[data-knowledge-id="isolated-menu"]').getByText('ภาพประกอบเมนู · ต้มยำกุ้ง', { exact: true }).waitFor();
    await p.waitForFunction(() => { const img = document.querySelector('[data-knowledge-id="isolated-menu"] img[src="/menu-illustrations/1.jpg"]'); return img?.complete && img.naturalWidth > 0; });
  }
  const menuCard = page.locator('[data-knowledge-id="isolated-menu"]');
  await menuCard.getByRole('button', { name: 'แก้ไขรูปภาพ', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: 'restaurant.png', mimeType: 'image/png', buffer: Buffer.from(picture.split(',')[1], 'base64') });
  assert.equal(await menuCard.locator('img[src="/menu-illustrations/1.jpg"]').count(), 1, 'starter remains in original card until save; editor now has actual upload');
  await page.getByRole('button', { name: 'บันทึกรูปภาพ', exact: true }).click();
  await page.getByRole('button', { name: 'บันทึกรูปภาพ', exact: true }).waitFor({ state: 'hidden' });
  await other.evaluate(() => window.dispatchEvent(new Event('focus')));
  await other.locator('[data-knowledge-id="isolated-menu"] img').waitFor();
  await other.locator('[data-knowledge-id="isolated-menu"]').getByText('รูปจากฐานความรู้', { exact: true }).waitFor();
  assert.equal(await other.locator('[data-knowledge-id="isolated-menu"] img[src="/menu-illustrations/1.jpg"]').count(), 0);
  await menuCard.getByRole('button', { name: 'แก้ไขรูปภาพ', exact: true }).click();
  await page.locator('button[title="ลบรูปนี้"]').click();
  await page.getByRole('button', { name: 'บันทึกรูปภาพ', exact: true }).click();
  await page.getByRole('button', { name: 'บันทึกรูปภาพ', exact: true }).waitFor({ state: 'hidden' });
  await other.evaluate(() => window.dispatchEvent(new Event('focus')));
  await other.locator('[data-knowledge-id="isolated-menu"]').getByRole('button', { name: 'เพิ่มรูปภาพ', exact: true }).waitFor();
  assert.equal(await other.locator('[data-knowledge-id="isolated-menu"] img[src="/menu-illustrations/1.jpg"]').count(), 0, 'intentional removal stays empty');
  await menuCard.getByRole('button', { name: 'เพิ่มรูปภาพ', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'คืนค่ารูปเดิม', exact: true }).click();
  await page.getByRole('button', { name: 'บันทึกรูปภาพ', exact: true }).waitFor({ state: 'hidden' });
  await other.evaluate(() => window.dispatchEvent(new Event('focus')));
  await other.locator('[data-knowledge-id="isolated-menu"]').getByText('ภาพประกอบเมนู · ต้มยำกุ้ง', { exact: true }).waitFor();
  assert.equal(aiCalls.length, 4, 'each submitted question calls API once; photo actions do not');
  assert.equal(await page.getByRole('checkbox', { name: 'AI อัตโนมัติ' }).count(), 0);
  assert.equal(await page.getByRole('button', { name: 'ให้ AI ช่วยตอบ', exact: true }).count(), 0);
  await page.locator('#main-search-input').fill('แล้วราคาเท่าไหร่');
  assert.equal(aiCalls.length, 4, 'typing does not call AI');
  await page.getByRole('button', { name: 'ส่งคำถาม', exact: true }).click();
  await page.locator('[data-turn-id]').last().getByText('คำตอบ AI ทดสอบ', { exact: true }).waitFor();
  assert.equal(aiCalls.length, 5);
  assert.equal(aiCalls[4].query, 'แล้วราคาเท่าไหร่');
  assert.equal(aiCalls[4].history[0].question, menuItem.title);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.qa-chat-turn').last().evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.locator('[data-turn-id]').last().getByRole('button', { name: 'คัดลอกคำตอบ', exact: true }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'คำตอบ AI ทดสอบ');
  await page.locator('#main-search-input').fill('ขอทั้งสองส่วน');
  await page.getByRole('button', { name: 'ส่งคำถาม', exact: true }).click();
  await page.getByText('ข้อมูลภายในทดสอบ', { exact: true }).waitFor();
  await page.locator('[data-turn-id]').last().getByRole('button', { name: 'คัดลอกคำตอบสำหรับพนักงาน', exact: true }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'ข้อมูลภายในทดสอบ');
  failAi = true;
  await page.locator('#main-search-input').fill('คำถามที่ API ล้มเหลว');
  await page.getByRole('button', { name: 'ส่งคำถาม', exact: true }).click();
  await page.getByRole('alert').getByText('AI ทดสอบขัดข้อง', { exact: true }).waitFor();
  assert.equal(await page.locator('[data-turn-id]').last().getByRole('button', { name: 'คัดลอกคำตอบ' }).count(), 0);
  failAi = false;
  await page.getByRole('button', { name: 'ลองใหม่', exact: true }).click();
  await page.locator('[data-turn-id]').last().getByText('คำตอบ AI ทดสอบ', { exact: true }).waitFor();
  const callsBeforeReload = aiCalls.length;
  const history = await page.evaluate(() => localStorage.getItem('baanhome_qa_conversation_v1:Administrator'));
  await user.evaluate(value => localStorage.setItem('baanhome_qa_conversation_v1:Administrator', value), history);
  await user.reload();
  await user.getByRole('heading', { name: 'วันนี้ให้โฮมช่วยเรื่องไหน?' }).waitFor();
  assert.equal(await user.locator('[data-turn-id]').count(), 0, 'another account cannot see saved admin history on shared browser');
  await page.reload();
  await page.locator('[data-turn-id]').nth(1).waitFor();
  assert.equal(await page.getByText('คำตอบ AI ทดสอบ', { exact: true }).count(), 0, 'do not restore stale generated facts');
  assert.equal(aiCalls.length, callsBeforeReload, 'reload must not trigger AI');
  await page.getByRole('button', { name: 'เริ่มบทสนทนาใหม่' }).click();
  assert.equal(await page.locator('[data-turn-id]').count(), 0);
  assert.equal(await other.locator('[data-turn-id]').count(), 1, 'reset affects own account only');
  await other.screenshot({ path: '/tmp/baanhome-menu-mobile.png', fullPage: true });
  assert.equal(await user.getByRole('button', { name: 'เพิ่มข้อมูล/คำตอบ', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'เพิ่มข้อมูล/คำตอบ', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'เพิ่มข้อมูล/คำตอบ', exact: true });
  await form.getByLabel('หัวข้อ', { exact: true }).fill('โปรโมชั่นทดสอบแยกจากข้อมูลจริง');
  await form.getByLabel('เนื้อหา / ราคา / เงื่อนไข').fill('ข้อมูลโปรโมชั่นทดสอบ');
  await form.getByLabel('การใช้งาน').selectOption('customer');
  failSave = true;
  await form.getByRole('button', { name: 'บันทึกข้อมูล', exact: true }).click();
  await form.getByRole('alert').getByText('ทดสอบบันทึกไม่สำเร็จ', { exact: true }).waitFor();
  failSave = false;
  await form.getByRole('button', { name: 'บันทึกข้อมูล', exact: true }).click();
  await form.waitFor({ state: 'hidden' });
  const stored = JSON.parse(knowledgeEntries[hash('main')].parts.map(id => parts.get(id)).join(''));
  assert.equal(stored.items.length, 3, 'adding knowledge preserves existing central records');
  assert.equal(stored.items.at(-1).customerMessage, 'ข้อมูลโปรโมชั่นทดสอบ');
  await other.evaluate(() => window.dispatchEvent(new Event('focus')));
  await other.getByRole('button', { name: 'ความรู้', exact: true }).click();
  await other.getByRole('button', { name: /เปิดอ่าน.*โปรโม/ }).click();
  await other.getByRole('heading', { name: 'โปรโมชั่นทดสอบแยกจากข้อมูลจริง', exact: true }).waitFor();
  await page.getByRole('button', { name: 'เพิ่มข้อมูล/คำตอบ', exact: true }).click();
  await form.getByLabel('เลือกข้อมูลที่ต้องการจัดการ').selectOption(stored.items.at(-1).id);
  await form.getByLabel('เนื้อหา / ราคา / เงื่อนไข').fill('โปรโมชั่นฉบับแก้ไข');
  await form.getByRole('button', { name: 'บันทึกข้อมูล', exact: true }).click();
  await form.waitFor({ state: 'hidden' });
  await other.reload();
  await other.getByRole('button', { name: 'เพิ่มข้อมูล/คำตอบ', exact: true }).click();
  const operatorForm = other.getByRole('dialog', { name: 'เพิ่มข้อมูล/คำตอบ', exact: true });
  await operatorForm.getByLabel('เลือกข้อมูลที่ต้องการจัดการ').selectOption(stored.items.at(-1).id);
  assert.equal(await operatorForm.getByRole('button', { name: 'ลบข้อมูล', exact: true }).count(), 0, 'operator cannot delete');
  await operatorForm.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await page.getByRole('button', { name: 'เพิ่มข้อมูล/คำตอบ', exact: true }).click();
  await form.getByLabel('เลือกข้อมูลที่ต้องการจัดการ').selectOption(stored.items.at(-1).id);
  assert.equal(await form.getByLabel('เนื้อหา / ราคา / เงื่อนไข').inputValue(), 'โปรโมชั่นฉบับแก้ไข');
  page.on('dialog', dialog => dialog.accept('test-password'));
  await form.getByRole('button', { name: 'ลบข้อมูล', exact: true }).click();
  await form.waitFor({ state: 'hidden' });
  const afterDelete = JSON.parse(knowledgeEntries[hash('main')].parts.map(id => parts.get(id)).join(''));
  assert.equal(afterDelete.items.length, 2, 'delete only selected manual record');
  assert.equal(aiCalls.length, callsBeforeReload, 'saving and reading knowledge never calls AI');
  console.log('PASS: desktop/mobile, menu, disclosures, lightbox, save errors, cross-context image refresh, knowledge/B2B/calendar views, role navigation, food starter/replacement/removal/reset, bounded followup AI and private account histories');
} finally { await browser.close(); server.kill(); }
