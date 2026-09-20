import { createHmac, timingSafeEqual } from 'node:crypto';
import { doc, getDoc } from 'firebase/firestore';
import { getDb } from '../api/_db.js';

const COOKIE = 'baanhome_session';
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('ต้องตั้งค่า SESSION_SECRET อย่างน้อย 32 ตัวอักษรบนเซิร์ฟเวอร์');
  return value;
}
function signature(value: string) { return createHmac('sha256', secret()).update(value).digest('base64url'); }
export function publicUser(user: any) { const { passwordHash, ...safe } = user; return safe; }
export function issueSession(res: any, user: any) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, credential: createHmac('sha256', secret()).update(user.passwordHash).digest('hex'), exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  res.setHeader('Set-Cookie', `${COOKIE}=${payload}.${signature(payload)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
}
export function clearSession(res: any) { res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`); }
export async function requireSession(req: any, roles?: string[]) {
  const token = String(req.headers?.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  const [payload, sig] = (token || '').split('.');
  if (!payload || !sig) throw Object.assign(new Error('กรุณาเข้าสู่ระบบอีกครั้ง'), { status: 401 });
  const expected = Buffer.from(signature(payload));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw Object.assign(new Error('เซสชันไม่ถูกต้อง'), { status: 401 });
  let session: any;
  try { session = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { throw Object.assign(new Error('เซสชันไม่ถูกต้อง'), { status: 401 }); }
  if (!session.id || session.exp <= Date.now()) throw Object.assign(new Error('กรุณาเข้าสู่ระบบอีกครั้ง'), { status: 401 });
  const snapshot = await getDoc(doc(getDb(), 'appUsers', session.id));
  const user = snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } as any : null;
  if (!user || user.status !== 'active' || session.credential !== createHmac('sha256', secret()).update(user.passwordHash).digest('hex')) throw Object.assign(new Error('บัญชีหรือเซสชันนี้ไม่สามารถใช้งานได้ กรุณาเข้าสู่ระบบใหม่'), { status: 401 });
  if (roles && !roles.includes(user.role)) throw Object.assign(new Error('สิทธิ์ไม่เพียงพอ'), { status: 403 });
  return user;
}
export function apiError(res: any, error: any) {
  console.error('Shared database request failed:', error?.code || error?.message);
  return res.status(error?.status || 503).json({ success: false, error: error?.status ? error.message : 'เชื่อมต่อฐานข้อมูลกลางไม่สำเร็จ ข้อมูลยังไม่ได้รับการยืนยันว่าบันทึกแล้ว' });
}
