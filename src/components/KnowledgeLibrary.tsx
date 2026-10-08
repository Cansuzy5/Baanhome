import React, { useState } from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import type { KnowledgeItem } from '../types';
import { KNOWLEDGE_CATEGORIES } from '../data/categories';
import { isCustomerReady } from '../utils/knowledgeFilter';
import { KnowledgeMedia } from './KnowledgeMedia';
export function KnowledgeLibrary({ items, onRead }: { items: KnowledgeItem[]; onRead: (item: KnowledgeItem) => void }) {
  const [category, setCategory] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find(i => i.id === selectedId);
  const visible = items.filter(i => category === 'all' || i.category === category);
  const sources = [...new Set(visible.map(i => i.sourceDoc || 'ข้อมูลกลางบ้านโฮม'))];
  return <div className="max-w-5xl mx-auto p-4 sm:p-8 text-[#293e31]">
    <h1 className="text-xl font-semibold text-[#214b38]">คลังความรู้</h1><p className="text-sm text-[#788477] mt-1 mb-5">เปิดอ่านและศึกษาข้อมูลบ้านโฮม</p>
    {selected ? <article className="bg-[#fffdf8] border border-[#e0e5da] rounded-2xl p-5 sm:p-7 shadow-sm">
      <button onClick={() => setSelectedId(null)} className="flex items-center gap-1 text-xs text-[#597662] mb-5"><ArrowLeft size={14} />กลับไปหัวข้อทั้งหมด</button>
      <span className="text-[11px] text-[#597662]">{isCustomerReady(selected) ? 'ส่งให้ลูกค้าได้' : 'ข้อมูลสำหรับพนักงาน'}</span>
      <h2 className="text-lg font-semibold mt-2 mb-4">{selected.title}</h2>
      <div className="space-y-4 text-sm leading-7 whitespace-pre-wrap break-words"><p>{selected.summary}</p>{(selected.detail || []).map((p,i) => <p key={i}>{p}</p>)}
      {selected.competitorData && <div>{Object.entries(selected.competitorData).filter(([,v]) => v).map(([k,v]) => <p key={k}>{({competitorName:'ชื่อคู่แข่ง',competitorType:'ประเภท',location:'ที่ตั้ง',capacityComp:'รองรับ',pricingComp:'ราคา',atmosphereComp:'บรรยากาศ',facilityComp:'สิ่งอำนวยความสะดวก',bhSweetSpot:'จุดเด่นบ้านโฮม',salesPitch:'แนวทางนำเสนอ',guardrails:'ข้อควรระวัง',mysteryShoppingStatus:'สถานะสำรวจ'} as Record<string,string>)[k] || k}: {Array.isArray(v) ? v.join('\n') : String(v)}</p>)}</div>}
      {isCustomerReady(selected) && selected.customerMessage && <div className="bg-[#edf3e9] rounded-xl p-4"><h3 className="font-medium mb-2">ข้อความสำหรับลูกค้า</h3>{selected.customerMessage}</div>}
      {(selected.nextActions || []).length > 0 && <div><h3 className="font-medium">แนวทางดำเนินการ</h3>{selected.nextActions.map((p,i) => <p key={i}>{p}</p>)}</div>}</div>
      <KnowledgeMedia item={selected} /><footer className="text-xs text-[#788477] mt-6 border-t border-[#e0e5da] pt-3">แหล่งข้อมูล: {selected.sourceDoc || 'ฐานความรู้กลาง'}{selected.docSection ? ` · ${selected.docSection}` : ''}<br />อัปเดต: {selected.lastUpdated || 'ไม่ระบุ'}{selected.dataStatus ? ` · ${selected.dataStatus}` : ''}</footer>
    </article> : <>
      <div className="flex flex-wrap gap-2 mb-5"><button onClick={() => setCategory('all')} className={`rounded-full px-3 py-2 text-xs ${category === 'all' ? 'bg-[#214b38] text-white' : 'bg-white border border-[#e0e5da]'}`}>ทั้งหมด ({items.length})</button>{KNOWLEDGE_CATEGORIES.filter(c => items.some(i => i.category === c.id)).map(c => <button key={c.id} onClick={() => setCategory(c.id)} className={`rounded-full px-3 py-2 text-xs ${category === c.id ? 'bg-[#214b38] text-white' : 'bg-white border border-[#e0e5da]'}`}>{c.nameTh} ({items.filter(i => i.category === c.id).length})</button>)}</div>
      <div className="space-y-6">{sources.map(source => <section key={source}><h2 className="text-sm font-medium text-[#597662] mb-3 flex gap-2 items-center"><BookOpen size={16} />{source}</h2><div className="grid sm:grid-cols-2 gap-3">{visible.filter(i => (i.sourceDoc || 'ข้อมูลกลางบ้านโฮม') === source).map(item => <button key={item.id} onClick={() => { setSelectedId(item.id); onRead(item); }} className="text-left bg-[#fffdf8] rounded-xl border border-[#e0e5da] p-4 shadow-sm hover:border-[#9db09b]"><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-[#788477] mt-2 line-clamp-2">{item.summary}</p><span className="text-[10px] text-[#597662] mt-2 block">{isCustomerReady(item) ? 'ส่งให้ลูกค้าได้' : 'ข้อมูลสำหรับพนักงาน'}</span></button>)}</div></section>)}</div>
    </>}
  </div>;
}
