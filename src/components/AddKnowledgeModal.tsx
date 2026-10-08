import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { KNOWLEDGE_CATEGORIES } from '../data/categories';
import type { KnowledgeCategory, KnowledgeItem } from '../types';
import { addManualKnowledgeItem } from '../utils/googleSheetsSync';
import { isCompetitorKnowledge } from '../utils/knowledgeFilter';

export function AddKnowledgeModal({ onClose, onSaved }: { onClose: () => void; onSaved: (items: KnowledgeItem[]) => void }) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [category, setCategory] = useState<KnowledgeCategory>('promotion-package');
  const [customer, setCustomer] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return;
    if (!title.trim() || !text.trim()) { setError('กรุณากรอกหัวข้อและเนื้อหา'); return; }
    if (startDate && endDate && endDate < startDate) { setError('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม'); return; }
    const internal = !customer || isCompetitorKnowledge({ title, category, summary: text });
    const item: KnowledgeItem = { id: `manual-${crypto.randomUUID()}`, title: title.trim(), category, summary: text.trim(), detail: [], customerMessage: internal ? '' : text.trim(), audience: internal ? 'Employee' : 'Both', status: internal ? 'Internal' : 'Published', aiUsable: internal ? 'Employee Only' : 'Yes', dataStatus: 'Confirmed', keywords: [], nextActions: [], sourceDoc: 'ข้อมูลที่หน้างานเพิ่ม', lastUpdated: new Date().toISOString().slice(0, 10), ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}) };
    setBusy(true); setError('');
    try { onSaved(await addManualKnowledgeItem(item)); onClose(); }
    catch (e: any) { setError(e.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่'); }
    finally { setBusy(false); }
  };
  const field = 'w-full rounded-xl border border-[#d6dfce] bg-white p-3 text-sm';
  return createPortal(<div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4" onClick={() => { if (!busy) onClose(); }}><form role="dialog" aria-modal="true" aria-label="เพิ่มข้อมูล/คำตอบ" onClick={e => e.stopPropagation()} onSubmit={save} className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl bg-[#fffef9] p-5 shadow-xl space-y-4 text-[#293e31]">
    <h2 className="text-lg font-semibold">เพิ่มข้อมูล/คำตอบ</h2>
    <p className="text-xs text-[#788477]">บันทึกลงฐานความรู้กลาง เพื่อเปิดอ่านและใช้ตอบคำถาม</p>
    <label className="block text-sm">หัวข้อ<input className={field} value={title} onChange={e => setTitle(e.target.value)} required maxLength={200} disabled={busy} /></label>
    <label className="block text-sm">หมวดหมู่<select className={field} value={category} onChange={e => setCategory(e.target.value as KnowledgeCategory)} disabled={busy}>{KNOWLEDGE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.nameTh}</option>)}</select></label>
    <label className="block text-sm">เนื้อหา / ราคา / เงื่อนไข<textarea className={field} rows={6} value={text} onChange={e => setText(e.target.value)} required maxLength={12000} disabled={busy} /></label>
    <label className="block text-sm">การใช้งาน<select className={field} value={customer ? 'customer' : 'staff'} onChange={e => setCustomer(e.target.value === 'customer')} disabled={busy}><option value="staff">ข้อมูลสำหรับพนักงาน</option><option value="customer">ส่งให้ลูกค้าได้</option></select></label>
    <div className="grid grid-cols-2 gap-3"><label className="text-sm">วันเริ่ม (ถ้ามี)<input type="date" className={field} value={startDate} onChange={e => setStartDate(e.target.value)} disabled={busy} /></label><label className="text-sm">วันสิ้นสุด (ถ้ามี)<input type="date" className={field} value={endDate} onChange={e => setEndDate(e.target.value)} disabled={busy} /></label></div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="text-sm px-4 py-2">ยกเลิก</button><button disabled={busy} className="rounded-xl bg-[#214b38] text-white px-4 py-2 text-sm disabled:opacity-50">{busy ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}</button></div>
  </form></div>, document.body);
}
