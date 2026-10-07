import React, { useMemo, useRef, useState } from 'react';
import type { QuestionLog, StaffProfile } from '../types';
import { bangkokDate, summarizeSearches, type SearchAnalyticsEvent } from '../utils/nongHomeAnalyticsModel';

const format = (number: number) => number.toLocaleString('th-TH');
const dateOffset = (days: number) => bangkokDate(new Date(Date.now() + days * 86400000).toISOString());
function Ranking({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  return <section className="bg-white rounded-2xl border border-[#E8E1D2] p-5"><h3 className="font-bold mb-4">{title}</h3>{rows.length ? <ol className="space-y-3">{rows.map((row, index) => <li key={row.label} className="flex gap-3 justify-between text-sm"><span className="break-words min-w-0">{index + 1}. {row.label}</span><strong className="shrink-0">{format(row.count)} ครั้ง</strong></li>)}</ol> : <p className="text-sm text-[#697E72]">ไม่มีข้อมูลในช่วงวันที่นี้</p>}</section>;
}
export function NongHomeAnalyticsView({ staff, legacyLogs }: { staff: StaffProfile; legacyLogs: QuestionLog[] }) {
  const [mode, setMode] = useState<'new' | 'legacy'>('new');
  const [from, setFrom] = useState(dateOffset(-6));
  const [to, setTo] = useState(dateOffset(0));
  const [password, setPassword] = useState('');
  const [events, setEvents] = useState<SearchAnalyticsEvent[] | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [loadedRange, setLoadedRange] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const legacy = useMemo(() => legacyLogs.filter(log => Number.isFinite(Date.parse(log.timestamp)) && bangkokDate(log.timestamp) >= from && bangkokDate(log.timestamp) <= to).map(log => ({ id: log.id, timestamp: log.timestamp, staffId: `legacy:${log.department}:${log.staffName}`, staffName: log.staffName, department: log.department, question: log.question, found: log.found, resultCount: log.found ? 1 : 0 })), [legacyLogs, from, to]);
  const ready = mode === 'legacy' || (events !== null && loadedRange === `${from}:${to}`);
  const stats = useMemo(() => summarizeSearches(mode === 'legacy' ? legacy : events || []), [mode, legacy, events]);
  if (staff.role !== 'Administrator') return null;
  const load = async (event: React.FormEvent) => {
    event.preventDefault(); const id = ++request.current;
    setLoading(true); setError(''); setEvents(null); setLoadedRange('');
    try {
      const response = await fetch('/api/nong-home-analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'report', authorization: { userId: staff.id, password }, from, to }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'อ่านสถิติไม่สำเร็จ');
      if (id === request.current) { setEvents(data.events); setStartedAt(data.startedAt); setLoadedRange(`${from}:${to}`); }
    } catch (error) { if (id === request.current) setError(error instanceof Error ? error.message : 'อ่านสถิติไม่สำเร็จ'); }
    finally { if (id === request.current) { setLoading(false); setPassword(''); } }
  };
  const cards = [
    ['คำถามที่บันทึก', ready ? format(stats.total) : '—'], ['ผู้ใช้งานจริง', ready ? `${format(stats.activeUsers)} คน` : '—'],
    ['แผนกที่ใช้งาน', ready ? `${format(stats.departments.length)} แผนก` : '—'],
    ['Knowledge Coverage', mode === 'new' && ready && stats.coverage !== null ? `${stats.coverage.toFixed(1)}%` : '—'],
    ['Knowledge Gap', mode === 'new' && ready && stats.gap !== null ? `${stats.gap.toFixed(1)}%` : '—'],
    ['คำถามที่ไม่พบข้อมูล', mode === 'new' && ready ? `${format(stats.missing)} ครั้ง` : '—'],
  ];
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
    <div className="rounded-2xl bg-[#1B3D2F] text-white p-6"><h2 className="text-2xl font-bold">สถิติน้องโฮม</h2><p className="mt-2 text-sm text-[#D3E3D8]">การใช้งานและช่องว่างฐานความรู้ • สำหรับแอดมิน</p></div>
    <section className="bg-white rounded-2xl border border-[#E8E1D2] p-4 space-y-4">
      <div className="flex flex-wrap gap-2">{(['new', 'legacy'] as const).map(value => <button key={value} onClick={() => setMode(value)} className={`px-4 py-2 rounded-xl text-sm ${mode === value ? 'bg-[#1B3D2F] text-white' : 'bg-[#F4EFE4]'}`}>{value === 'new' ? 'สถิติใหม่' : 'ประวัติเดิม'}</button>)}</div>
      <div className="flex flex-wrap gap-2">{[['วันนี้', 0], ['7 วัน', -6], ['เดือนนี้', 1]] .map(([label, days]) => <button key={String(label)} className="text-sm border rounded-lg px-3 py-1" onClick={() => { setFrom(days === 1 ? dateOffset(0).slice(0, 8) + '01' : dateOffset(Number(days))); setTo(dateOffset(0)); }}>{label}</button>)}</div>
      <form onSubmit={load} className="flex flex-wrap items-end gap-3"><label className="text-sm">ตั้งแต่<input aria-label="วันที่เริ่มต้น" type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} required className="block border rounded-lg p-2" /></label><label className="text-sm">ถึง<input aria-label="วันที่สิ้นสุด" type="date" value={to} min={from} onChange={e => setTo(e.target.value)} required className="block border rounded-lg p-2" /></label>{mode === 'new' && <><label className="text-sm">ยืนยันรหัสผ่านแอดมิน<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required className="block border rounded-lg p-2" /></label><button disabled={loading} className="rounded-xl bg-[#1B3D2F] text-white p-2 px-5 disabled:opacity-50">{loading ? 'กำลังอ่าน…' : 'ดูสถิติ'}</button></>}</form>
      <p className="text-xs text-[#697E72]">{mode === 'legacy' ? 'ประวัติเดิมนับเฉพาะ Log ที่มีอยู่ แยกคนตามชื่อและแผนก จึงอาจไม่เท่ากับจำนวนคนจริง และใช้คำนวณ Coverage/Gap ไม่ได้' : 'นับเมื่อหยุดพิมพ์ 1.5 วินาที คำค้นอย่างน้อย 2 ตัวอักษร ทั้งพบและไม่พบข้อมูล ไม่เพิ่มยอดจากการเปลี่ยนตัวกรอง • วันที่อ้างอิงเวลาไทย'}</p>
      {startedAt && mode === 'new' && <p className="text-xs text-[#697E72]">เริ่มบันทึกใหม่ {new Date(startedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} • ประวัติเดิมแยกจากชุดใหม่เพื่อไม่นับซ้ำ</p>}
      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{error}</p>}
    </section>
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">{cards.map(([label, value]) => <div key={label} className="bg-white border border-[#E8E1D2] rounded-2xl p-4"><p className="text-sm text-[#697E72]">{label}</p><strong className="block mt-2 text-2xl">{value}</strong></div>)}</div>
    {ready && <><p className="text-xs text-[#697E72]">Coverage = คำถามที่ค้นพบข้อมูล ÷ คำถามที่บันทึกทั้งหมด • Gap = คำถามที่ไม่พบข้อมูล ÷ คำถามที่บันทึกทั้งหมด • การพบข้อมูลไม่ได้ยืนยันว่าคำตอบถูกต้องหรือพนักงานทำงานสำเร็จ</p>
    <section className="bg-white rounded-2xl border border-[#E8E1D2] p-5"><h3 className="font-bold mb-4">จำนวนคำถามรายวัน</h3>{stats.daily.length ? <div className="space-y-2">{stats.daily.map(row => <div key={row.label} className="flex items-center gap-3 text-xs"><span className="w-24 shrink-0">{row.label}</span><div className="flex-1 bg-[#F4EFE4] rounded-full"><div className="bg-[#2D5A43] h-3 rounded-full" style={{ width: `${row.count / Math.max(...stats.daily.map(day => day.count)) * 100}%` }} /></div><strong>{format(row.count)}</strong></div>)}</div> : <p className="text-sm text-[#697E72]">ยังไม่มีคำถามที่บันทึกในช่วงนี้</p>}</section>
    <div className="grid md:grid-cols-2 gap-4"><Ranking title="จำนวนคำถามต่อแผนก" rows={stats.departments} /><section className="bg-white rounded-2xl border border-[#E8E1D2] p-5"><h3 className="font-bold mb-4">จำนวนคำถามต่อคน</h3>{stats.staff.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-[#697E72]"><th className="py-2">พนักงาน</th><th>แผนก</th><th className="text-right">ครั้ง</th></tr></thead><tbody>{stats.staff.map(row => <tr key={row.id} className="border-t"><td className="py-3 pr-3">{row.label}</td><td className="pr-3">{row.department}</td><td className="text-right font-bold">{format(row.count)}</td></tr>)}</tbody></table></div> : <p className="text-sm text-[#697E72]">ไม่มีข้อมูลในช่วงวันที่นี้</p>}</section><Ranking title="10 คำถามที่ถามบ่อย (รวมคำค้นตรงกัน)" rows={stats.questions} />{mode === 'new' && <Ranking title="10 คำถามที่ไม่พบข้อมูล" rows={stats.gaps} />}</div></>}
  </div>;
}
