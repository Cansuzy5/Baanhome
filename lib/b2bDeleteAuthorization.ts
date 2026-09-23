import { createHash, timingSafeEqual } from 'node:crypto';

export class B2BPermissionError extends Error {}

// The existing app login has no server-verifiable session token. Reconfirm the
// current password for destructive requests instead of trusting a client role.
export function verifyDeleteAdministrator(user: any, password: unknown): void {
  if (typeof password !== 'string' || !password || password.length > 1024 ||
      user?.status !== 'active' || user?.role !== 'Administrator' ||
      !/^[a-f0-9]{64}$/i.test(user?.passwordHash || '')) {
    throw new B2BPermissionError('ลบไม่สำเร็จ: ต้องยืนยันรหัสผ่านของแอดมินที่ใช้งานอยู่');
  }
  const actual = createHash('sha256').update('BaanHome_Secure_Salt_2026_!' + password).digest();
  if (!timingSafeEqual(actual, Buffer.from(user.passwordHash, 'hex'))) {
    throw new B2BPermissionError('ลบไม่สำเร็จ: รหัสผ่านแอดมินไม่ถูกต้อง');
  }
}
