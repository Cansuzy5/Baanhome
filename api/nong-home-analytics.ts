import type { QueryConstraint } from 'firebase/firestore';
import { collection, doc, documentId, getDocFromServer, getDocsFromServer, limit, orderBy, query, runTransaction, startAfter, where } from 'firebase/firestore';
import { getOperationalDb } from './_db.js';
import { verifyDeleteAdministrator } from '../lib/b2bDeleteAuthorization.js';
import { analyticsKey, analyticsRange, decryptAnalytics, encryptAnalytics, EVENT_PREFIX, META_ID, validateAnalyticsEvent } from '../lib/nongHomeAnalytics.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const action = req.body?.action;
  if (!['record', 'report'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
  try {
    const database = getOperationalDb();
    if (action === 'report') {
      const auth = req.body?.authorization;
      if (typeof auth?.userId !== 'string' || !/^[\w-]{1,128}$/.test(auth.userId)) return res.status(403).json({ error: 'กรุณายืนยันรหัสผ่านแอดมิน' });
      const user = await getDocFromServer(doc(database, 'appUsers', auth.userId));
      try { verifyDeleteAdministrator(user.exists() ? user.data() : null, auth.password); }
      catch { return res.status(403).json({ error: 'บัญชีหรือรหัสผ่านแอดมินไม่ถูกต้อง' }); }
      const key = analyticsKey();
      const range = analyticsRange(req.body.from, req.body.to);
      const events = [];
      let cursor: any;
      do {
        const constraints: QueryConstraint[] = [where(documentId(), '>=', range.lower), where(documentId(), '<', range.upper), orderBy(documentId()), limit(300)];
        if (cursor) constraints.push(startAfter(cursor));
        const page = await getDocsFromServer(query(collection(database, 'systemConfig'), ...constraints));
        for (const row of page.docs) events.push(decryptAnalytics(row.id.slice(EVENT_PREFIX.length), row.data(), key));
        if (events.length > 10000) return res.status(422).json({ error: 'ข้อมูลช่วงนี้เกิน 10,000 ครั้ง กรุณาเลือกช่วงวันที่ให้สั้นลง' });
        if (page.size < 300) break;
        cursor = page.docs[page.docs.length - 1];
      } while (cursor);
      const meta = await getDocFromServer(doc(database, 'systemConfig', META_ID));
      return res.status(200).json({ events, startedAt: meta.data()?.startedAt || null });
    }
    const key = analyticsKey(); // Disabled until explicitly configured; no existing data touched.
    let event;
    try { event = validateAnalyticsEvent(req.body.event); }
    catch { return res.status(400).json({ error: 'Invalid analytics event' }); }
    const user = await getDocFromServer(doc(database, 'appUsers', event.staffId));
    if (!user.exists() || user.data().status !== 'active') return res.status(403).json({ error: 'Inactive user' });
    // Names/departments are taken from the central account, never client labels.
    event.staffName = user.data().name;
    event.department = user.data().department || 'ไม่ระบุแผนก';
    const ref = doc(database, 'systemConfig', EVENT_PREFIX + event.id);
    const meta = doc(database, 'systemConfig', META_ID);
    await runTransaction(database, async tx => {
      const existing = await tx.get(ref);
      const first = await tx.get(meta);
      if (!existing.exists()) tx.set(ref, encryptAnalytics(event, key));
      if (!first.exists()) tx.set(meta, { startedAt: new Date().toISOString(), version: 1 });
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    const unconfigured = error instanceof Error && error.message === 'ANALYTICS_NOT_CONFIGURED';
    const invalidRange = error instanceof Error && error.message === 'INVALID_DATE_RANGE';
    return res.status(invalidRange ? 400 : 503).json({ error: unconfigured ? 'ยังไม่เปิดเก็บสถิติใหม่: ต้องตั้งค่า NONG_HOME_ANALYTICS_SECRET ที่เซิร์ฟเวอร์' : invalidRange ? 'กรุณาเลือกช่วงวันที่ให้ถูกต้อง ไม่เกิน 1 ปี' : 'อ่านหรือบันทึกสถิติไม่สำเร็จ กรุณาลองใหม่ ข้อมูลนี้ยังยืนยันไม่ได้' });
  }
}
