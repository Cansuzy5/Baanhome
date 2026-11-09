import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { KNOWLEDGE_CATEGORIES } from '../data/categories';
import type { KnowledgeCategory, KnowledgeItem, UnansweredQuestion } from '../types';
import { getManualKnowledgeHistory, saveManualKnowledgeItem } from '../utils/googleSheetsSync';
import { isCompetitorKnowledge } from '../utils/knowledgeFilter';

import { askConversation } from '../utils/aiConversation';

export function AddKnowledgeModal({ items, gap, canDelete, onClose, onSaved }: { items: KnowledgeItem[]; gap?: UnansweredQuestion | null; canDelete: boolean; onClose: () => void; onSaved: (items: KnowledgeItem[]) => void }) {
  const [showHistory, setShowHistory] = useState(false);
  const history = getManualKnowledgeHistory();
  const manualItems = items.filter(i => i.id.startsWith('manual-'));
  const [editingId, setEditingId] = useState('');
  const [title, setTitle] = useState(gap?.question.slice(0, 200) || '');
  const [text, setText] = useState('');
  const [category, setCategory] = useState<KnowledgeCategory>(gap?.suggestedCategory || 'promotion-package');
  const [customer, setCustomer] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState('');
  const [approved, setApproved] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftNote, setDraftNote] = useState('');
  const [draftSources, setDraftSources] = useState<KnowledgeItem[]>([]);
  const draftRequest = useRef<AbortController | null>(null);
  useEffect(() => () => draftRequest.current?.abort(), []);
  const generateDraft = async () => {
    if (!gap || draftRequest.current || busy) return;
    const request = new AbortController();
    draftRequest.current = request;
    setDrafting(true); setApproved(false); setDraftNote(''); setDraftSources([]);
    try {
      const reply = await askConversation(
        'ร่างคำตอบสำหรับพนักงานเพื่อตรวจทานก่อนบันทึกเข้าฐานความรู้ ห้ามเติมราคา เวลา หรือเงื่อนไข หากหลักฐานไม่พอให้ระบุว่าต้องตรวจสอบ: ' + gap.question.slice(0, 750),
        items, [], request.signal
      );
      if (request.signal.aborted) return;
      const evidence = items.filter(item => reply.referenceIds.includes(item.id));
      const answer = (reply.staffAnswer || reply.customerAnswer).trim();
      if (!evidence.length || !answer) {
        setDraftNote('ยังไม่มีข้อมูลอ้างอิงเพียงพอ กรุณาตรวจข้อมูลจริงและกรอกคำตอบเอง');
        return;
      }
      setText(answer.slice(0, 12000));
      setDraftSources(evidence);
      setDraftNote('ตรวจเนื้อหาและหลักฐานก่อนอนุมัติ โดยเฉพาะราคา เวลา และเงื่อนไข');
    } catch {
      if (!request.signal.aborted) setDraftNote('สร้างร่างไม่ได้ในตอนนี้ ลองใหม่หรือกรอกคำตอบเองได้');
    } finally {
      if (draftRequest.current === request) draftRequest.current = null;
      if (!request.signal.aborted) setDrafting(false);
    }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy || drafting) return;
    if (gap && (!approved || !source.trim())) { setError('กรุณาระบุแหล่งข้อมูลและยืนยันว่าได้ตรวจคำตอบแล้ว'); return; }
    if (!title.trim() || !text.trim()) { setError('กรุณากรอกหัวข้อและเนื้อหา'); return; }
    if (startDate && endDate && endDate < startDate) { setError('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม'); return; }
    const internal = !customer || isCompetitorKnowledge({ title, category, summary: text });
    const item: KnowledgeItem = { id: editingId || `manual-${crypto.randomUUID()}`, title: title.trim(), category, summary: text.trim(), detail: [], customerMessage: internal ? '' : text.trim(), audience: internal ? 'Employee' : 'Both', status: internal ? 'Internal' : 'Published', aiUsable: internal ? 'Employee Only' : 'Yes', dataStatus: 'Confirmed', keywords: [], nextActions: [], sourceDoc: gap ? source.trim() : 'ข้อมูลที่หน้างานเพิ่ม', lastUpdated: new Date().toISOString().slice(0, 10), ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}) };
    setBusy(true); setError('');
    try { onSaved(await saveManualKnowledgeItem(item, false, items.find(saved => saved.id === editingId))); onClose(); }
    catch (e: any) { setError(e.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่'); }
    finally { setBusy(false); }
  };
  const selectItem = (id: string) => {
    const item = items.find(i => i.id === id);
    setShowHistory(false);
    setEditingId(id); setTitle(item?.title || ''); setText(item?.summary || '');
    setCategory(item?.category || 'promotion-package'); setCustomer(!!item?.customerMessage);
    setStartDate(item?.startDate || ''); setEndDate(item?.endDate || ''); setError('');
  };
  const removeItem = async () => {
    const item = items.find(i => i.id === editingId);
    if (!canDelete || !item || busy || !window.confirm(`ลบข้อมูล “${item.title}” จากฐานกลาง?`)) return;
    const password = window.prompt('ยืนยันรหัสผ่านแอดมินเพื่อลบข้อมูล');
    if (!password) return;
    setBusy(true); setError('');
    try { onSaved(await saveManualKnowledgeItem(item, true, item, password)); onClose(); }
    catch (e: any) { setError(e.message || 'ลบไม่สำเร็จ'); }
    finally { setBusy(false); }
  };
  const field = 'w-full rounded-xl border border-[#d6dfce] bg-white p-3 text-sm';
  return createPortal(<div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4" onClick={() => { if (!busy) onClose(); }}><form role="dialog" aria-modal="true" aria-label="เพิ่มข้อมูล/คำตอบ" onClick={e => e.stopPropagation()} onSubmit={save} className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl bg-[#fffef9] p-5 shadow-xl space-y-4 text-[#293e31]">
    <h2 className="text-lg font-semibold">เพิ่มข้อมูล/คำตอบ</h2>
    <p className="text-xs text-[#788477]">บันทึกลงฐานความรู้กลาง เพื่อเปิดอ่านและใช้ตอบคำถาม</p>
    {!gap && <div className="flex gap-2 text-sm"><button type="button" onClick={() => selectItem('')} disabled={busy} className="rounded-xl border border-[#d6dfce] px-3 py-2">เพิ่มข้อมูลใหม่</button><button type="button" onClick={() => setShowHistory(!showHistory)} disabled={busy} className="rounded-xl border border-[#d6dfce] px-3 py-2">{showHistory ? 'กลับไปแบบฟอร์ม' : 'ประวัติ / จัดการข้อมูล'}</button></div>}
    {showHistory ? <section aria-label="ประวัติข้อมูลที่หน้างานเพิ่ม" className="space-y-4">
      <h3 className="font-semibold text-sm">รายการที่เพิ่มไว้ ({manualItems.length})</h3>
      {manualItems.map(item => { const latest = [...history].reverse().find(e => e.itemId === item.id); return <button type="button" key={item.id} onClick={() => selectItem(item.id)} className="w-full text-left rounded-xl border border-[#d6dfce] p-3"><span className="block text-sm font-medium">{item.title}</span><span className="block text-xs text-[#788477] mt-1">{latest ? `${latest.actorName} · ${new Date(latest.at).toLocaleString('th-TH')}` : `อัปเดต ${item.lastUpdated} · ไม่มีประวัติผู้เพิ่มเดิม`}</span><span className="block text-xs text-[#597662] mt-2">เปิดแก้ไข{canDelete ? ' / ลบ' : ''}</span></button>; })}
      {!manualItems.length && <p className="text-sm text-[#788477]">ยังไม่มีรายการที่หน้างานเพิ่ม</p>}
      <h3 className="font-semibold text-sm">ประวัติการเปลี่ยนแปลง</h3>
      {[...history].reverse().map(event => <div key={event.id} className="border-b border-[#e0e5da] py-2 text-xs"><p>{event.action === 'added' ? 'เพิ่ม' : event.action === 'edited' ? 'แก้ไข' : 'ลบ'} · {event.title}</p><p className="text-[#788477] mt-1">{event.actorName} · {new Date(event.at).toLocaleString('th-TH')}</p></div>)}
      {!history.length && <p className="text-xs text-[#788477]">เริ่มเก็บประวัติจากการบันทึกหลังอัปเดตครั้งนี้</p>}
    </section> : <>
    {!gap && <label className="block text-sm">รายการที่หน้างานเพิ่ม<select aria-label="เลือกข้อมูลที่ต้องการจัดการ" className={field} value={editingId} onChange={e => selectItem(e.target.value)} disabled={busy}><option value="">เพิ่มข้อมูลใหม่</option>{items.filter(i => i.id.startsWith('manual-')).map(i => <option key={i.id} value={i.id}>{i.title}</option>)}</select></label>}
    <label className="block text-sm">หัวข้อ<input className={field} value={title} onChange={e => setTitle(e.target.value)} required maxLength={200} disabled={busy} /></label>
    <label className="block text-sm">หมวดหมู่<select className={field} value={category} onChange={e => setCategory(e.target.value as KnowledgeCategory)} disabled={busy}>{KNOWLEDGE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.nameTh}</option>)}</select></label>
    {gap && <div className="space-y-2 rounded-xl border border-[#d6dfce] p-3 text-sm">
      <p>คำถาม: {gap.question}</p>
      <button type="button" disabled={busy || drafting} onClick={() => void generateDraft()} className="rounded-lg border border-[#d6dfce] px-3 py-2 disabled:opacity-50">{drafting ? 'กำลังร่าง…' : 'ให้ AI ร่างคำตอบ'}</button>
      {draftNote && <p role="status" className="text-xs">{draftNote}</p>}
      {!!draftSources.length && <ul className="list-disc pl-5 text-xs">{draftSources.map(item => <li key={item.id}>{item.title} · {item.sourceDoc}</li>)}</ul>}
    </div>}
    <label className="block text-sm">เนื้อหา / ราคา / เงื่อนไข<textarea className={field} rows={6} value={text} onChange={e => { setText(e.target.value); setApproved(false); }} required maxLength={12000} disabled={busy || drafting} /></label>
    <label className="block text-sm">การใช้งาน<select className={field} value={customer ? 'customer' : 'staff'} onChange={e => setCustomer(e.target.value === 'customer')} disabled={busy}><option value="staff">ข้อมูลสำหรับพนักงาน</option><option value="customer">ส่งให้ลูกค้าได้</option></select></label>
    <div className="grid grid-cols-2 gap-3"><label className="text-sm">วันเริ่ม (ถ้ามี)<input type="date" className={field} value={startDate} onChange={e => setStartDate(e.target.value)} disabled={busy} /></label><label className="text-sm">วันสิ้นสุด (ถ้ามี)<input type="date" className={field} value={endDate} onChange={e => setEndDate(e.target.value)} disabled={busy} /></label></div>
    {gap && <>
      <label className="block text-sm">แหล่งข้อมูลที่ตรวจแล้ว<input className={field} value={source} onChange={e => { setSource(e.target.value); setApproved(false); }} required maxLength={200} disabled={busy} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} disabled={busy || drafting} />ตรวจคำตอบและแหล่งข้อมูลแล้ว</label>
    </>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex flex-wrap justify-end gap-3">{editingId && canDelete && <button type="button" disabled={busy} onClick={() => void removeItem()} className="text-sm text-red-700 px-4 py-2">ลบข้อมูล</button>}<button type="button" disabled={busy} onClick={onClose} className="text-sm px-4 py-2">ยกเลิก</button><button disabled={busy || drafting || !!gap && !approved} className="rounded-xl bg-[#214b38] text-white px-4 py-2 text-sm disabled:opacity-50">{busy ? 'กำลังบันทึก…' : gap ? 'อนุมัติและบันทึก' : 'บันทึกข้อมูล'}</button></div>
    </>}
    {showHistory && <button type="button" onClick={onClose} className="text-sm px-4 py-2">ปิด</button>}
  </form></div>, document.body);
}
