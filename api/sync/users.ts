import { setCorsHeaders } from '../../lib/cors.js';
import { createHash, timingSafeEqual } from 'node:crypto';
import { collection, getDocs, doc, runTransaction } from 'firebase/firestore';
import { getDb } from '../_db.js';
import { requireSession, issueSession, clearSession, publicUser, apiError } from '../../lib/sharedSession.js';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'POST' && req.body?.action === 'logout') { clearSession(res); return res.json({ success: true }); }
    const db = getDb();
    if (req.method === 'POST' && req.body?.action === 'login') {
      const username = String(req.body.username || '').trim().toLowerCase().replace(/^@/, '');
      const hash = createHash('sha256').update('BaanHome_Secure_Salt_2026_!' + String(req.body.password || '').trim()).digest('hex');
      const snapshot = await getDocs(collection(db, 'appUsers'));
      const user = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as any)).find(u => String(u.username).toLowerCase() === username);
      const expected = Buffer.from(user?.passwordHash || '');
      const actual = Buffer.from(hash);
      if (!user || user.status !== 'active' || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return res.status(401).json({ success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับ' });
      issueSession(res, user);
      return res.json({ success: true, user: publicUser(user) });
    }
    const actor = await requireSession(req);
    if (req.method === 'GET') {
      if (actor.role !== 'Administrator') return res.json({ users: [publicUser(actor)] });
      const snapshot = await getDocs(collection(db, 'appUsers'));
      return res.json({ users: snapshot.docs.map(d => publicUser({ ...d.data(), id: d.id })) });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    if (actor.role !== 'Administrator') return res.status(403).json({ error: 'สิทธิ์ไม่เพียงพอ' });
    const { action, id, changes = {} } = req.body || {};
    if (!['create', 'update', 'delete'].includes(action) || typeof id !== 'string' || !/^[\w-]{1,128}$/.test(id)) return res.status(400).json({ error: 'คำสั่งบัญชีผู้ใช้ไม่ถูกต้อง' });
    if (id === actor.id && (action === 'delete' || changes.status === 'inactive' || (changes.role && changes.role !== 'Administrator'))) return res.status(400).json({ error: 'ไม่สามารถลบ ระงับ หรือลดสิทธิ์บัญชีตนเองได้' });
    const allowed = ['username','name','department','role','status','avatar','passwordHash','createdAt','lastPasswordResetAt'];
    if (Object.keys(changes).some(k => !allowed.includes(k))) return res.status(400).json({ error: 'มีฟิลด์บัญชีที่ไม่รองรับ' });
    if (action === 'create') {
      const existingUsers = await getDocs(collection(db, 'appUsers'));
      if (existingUsers.docs.some(d => String(d.data().username).toLowerCase() === String(changes.username).toLowerCase())) return res.status(409).json({ error: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });
    }
    // Username claims prevent simultaneous creation of duplicate usernames.
    await runTransaction(db, async tx => {
      const ref = doc(db, 'appUsers', id);
      const snap = await tx.get(ref);
      if (action === 'create' && snap.exists()) throw Object.assign(new Error('บัญชีนี้มีอยู่แล้ว'), { status: 409 });
      if (action !== 'create' && !snap.exists()) throw Object.assign(new Error('ไม่พบบัญชี'), { status: 404 });
      const next = { ...(snap.data() || {}), ...changes, id } as any;
      if (action === 'delete') { tx.delete(ref); return; }
      if (!next.username || !next.name || !next.department || !['Knowledge User','Operator','Administrator'].includes(next.role) || !['active','inactive'].includes(next.status) || !/^[a-f0-9]{64}$/.test(next.passwordHash || '')) throw Object.assign(new Error('ข้อมูลบัญชีไม่ครบหรือไม่ถูกต้อง'), { status: 400 });
      if (action !== 'create' && changes.username && changes.username !== snap.data()?.username) throw Object.assign(new Error('ไม่รองรับการเปลี่ยนชื่อเข้าสู่ระบบ'), { status: 400 });
      if (action === 'create') {
        const claim = doc(db, 'systemConfig', 'username_' + createHash('sha256').update(next.username.toLowerCase()).digest('hex'));
        const existing = await tx.get(claim);
        if (existing.exists()) throw Object.assign(new Error('ชื่อผู้ใช้นี้ถูกใช้แล้ว'), { status: 409 });
        tx.set(claim, { userId: id });
      }
      tx.set(ref, next);
    });
    return res.json({ success: true });
  } catch (error) { return apiError(res, error); }
}
