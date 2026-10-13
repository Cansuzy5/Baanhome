import React, { useEffect, useRef, useState } from 'react';
import { createPrivateChatBackup } from '../utils/privateChatBackup';
import type { ConversationTurn } from '../utils/qaConversation';
import { chatPayload } from '../utils/privateChatPayload';
export function PrivateChatBackup({ turns, busy, onRestore }: { turns: ConversationTurn[]; busy: boolean; onRestore: (turns: ConversationTurn[]) => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [identity, setIdentity] = useState('');
  const [saved, setSaved] = useState<ConversationTurn[] | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const service = useRef<ReturnType<typeof createPrivateChatBackup> | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; void service.current?.close(); service.current = null; }; }, []);
  const execute = async (fn: () => Promise<void>) => {
    if (working || busy) return;
    setWorking(true); setMessage('');
    try { await fn(); } catch (error: any) { if (mounted.current) setMessage(error.code ? 'เชื่อมต่อไม่สำเร็จ กรุณาตรวจบัญชีสำรองแชทและการตั้งค่าสิทธิ์กับผู้ดูแล แชทในเครื่องยังอยู่' : error.message); }
    finally { if (mounted.current) setWorking(false); }
  };
  const close = async () => { const old = service.current; service.current = null; await old?.close(); if (mounted.current) { setOpen(false); setIdentity(''); setPassword(''); setSaved(null); setMessage(''); } };
  return <div className="mt-3 text-xs text-[#597662]">
    <button onClick={() => setOpen(true)} className="underline">สำรองแชทส่วนตัว · ทดลอง</button>
    {open && <section aria-label="สำรองแชทส่วนตัว" className="mt-3 p-4 rounded-xl border border-[#d6dfce] bg-[#fffef9] space-y-3">
      <p>สำรองข้อความล่าสุดไม่เกิน 20 รอบ ย้อนหลัง 30 วัน ข้อมูลเก็บเมื่อกดสำรองเท่านั้น เปิดย้อนหลังไม่เรียก AI</p>
      {!identity ? <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); void execute(async () => {
        await service.current?.close(); const client = createPrivateChatBackup(); service.current = client;
        const who = await client.login(email.trim(), password); setPassword('');
        const result = await client.load();
        if (mounted.current && service.current === client) { setIdentity(who); setSaved(result); }
      }); }}>
        <p className="w-full">ใช้บัญชีสำรองแชทที่ผู้ดูแลจัดให้ แยกจากบัญชีเข้าเว็บเดิม</p>
        <input aria-label="อีเมลสำรองแชท" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} className="border rounded p-2" placeholder="อีเมล" />
        <input aria-label="รหัสผ่านสำรองแชท" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="border rounded p-2" placeholder="รหัสผ่าน" />
        <button disabled={working || busy} className="border rounded px-3 py-2 disabled:opacity-40">เชื่อมต่อ</button>
      </form> : <>
        <p>บัญชีสำรอง: {identity} · พบ {saved?.length || 0} รอบ</p>
        <div className="flex flex-wrap gap-3">
          <button disabled={working || busy || saved === null} onClick={() => { if (window.confirm('แทนที่ข้อมูลสำรองกลางด้วยแชทที่เห็นในเครื่องนี้?')) void execute(async () => { const snapshot = JSON.parse(chatPayload(turns)); await service.current!.save(snapshot); if (mounted.current) { setSaved(snapshot); setMessage('สำรองข้อมูลกลางสำเร็จ'); } }); }} className="underline disabled:opacity-40">สำรองแชทในเครื่อง</button>
          <button disabled={working || busy || !saved?.length} onClick={() => { if (window.confirm('นำประวัติกลางมาแทนแชทที่เห็นในเครื่องนี้?')) { onRestore(saved!); setMessage('เปิดประวัติแล้ว · คำตอบเป็นข้อมูล ณ วันที่ตอบ'); } }} className="underline disabled:opacity-40">เปิดประวัติกลาง</button>
          <button disabled={working || busy || saved === null} onClick={() => { if (window.confirm('ลบข้อมูลสำรองกลางของบัญชีนี้? แชทในเครื่องจะยังอยู่')) void execute(async () => { await service.current!.remove(); if (mounted.current) { setSaved([]); setMessage('ลบข้อมูลสำรองกลางแล้ว'); } }); }} className="underline disabled:opacity-40">ลบข้อมูลสำรองกลาง</button>
        </div>
      </>}
      {working && <p role="status">กำลังดำเนินการ…</p>}
      {message && <p role="status">{message}</p>}
      <button disabled={working} onClick={() => void close()} className="underline">ปิดและออกจากบัญชีสำรอง</button>
    </section>}
  </div>;
}
