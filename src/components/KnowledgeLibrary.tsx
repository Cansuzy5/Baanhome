import React, { useState } from 'react';
import { ArrowLeft, BookOpen, ChevronRight, Leaf } from 'lucide-react';
import type { KnowledgeItem } from '../types';
import { KNOWLEDGE_CATEGORIES } from '../data/categories';
import { isCustomerReady } from '../utils/knowledgeFilter';
import { READER_TITLES, readerChapters, readerHeading, readerParagraphs } from '../utils/knowledgeReader';
import { KnowledgeMedia } from './KnowledgeMedia';
const competitorLabels: Record<string, string> = { competitorName: 'ชื่อคู่แข่ง', competitorType: 'ประเภท', location: 'ที่ตั้ง', capacityComp: 'รองรับ', pricingComp: 'ราคา', atmosphereComp: 'บรรยากาศ', facilityComp: 'สิ่งอำนวยความสะดวก', bhSweetSpot: 'จุดเด่นบ้านโฮม', salesPitch: 'แนวทางนำเสนอ', guardrails: 'ข้อควรระวัง', mysteryShoppingStatus: 'สถานะสำรวจ' };
export function KnowledgeLibrary({ items, onRead }: { items: KnowledgeItem[]; onRead: (item: KnowledgeItem) => void }) {
  const [category, setCategory] = useState<string | null>(null);
  const categories = KNOWLEDGE_CATEGORIES.filter(c => items.some(i => i.category === c.id));
  const chapters = category ? readerChapters(items, category) : [];
  const title = category ? READER_TITLES[category] || categories.find(c => c.id === category)?.nameTh || category : '';
  const sources = [...new Set(chapters.flatMap(c => c.items.map(i => i.sourceDoc).filter(Boolean)))];
  const anchorFor = (id: string) => `reader-topic-${encodeURIComponent(id)}`;
  const openBook = (id: string) => {
    setCategory(id);
    const first = items.find(i => i.category === id); if (first) onRead(first);
  };
  return <div className="knowledge-library max-w-5xl mx-auto px-4 sm:px-8 py-6 text-[#293e31]">
    <h1 className="text-xl font-semibold text-[#214b38]">คลังความรู้</h1><p className="text-sm text-[#788477] mt-1 mb-6">อ่านและศึกษาข้อมูลบ้านโฮม แบ่งเป็นหมวดเหมือนคู่มือ</p>
    {!category ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map((c, index) => <button key={c.id} onClick={() => openBook(c.id)} aria-label={`เปิดอ่าน ${READER_TITLES[c.id] || c.nameTh}`} className="knowledge-book-cover group relative text-left rounded-2xl border border-[#dce3d3] bg-[#fffef9] p-5 pl-7 shadow-sm hover:border-[#9caf8a] transition-colors overflow-hidden min-h-[168px]">
        <span className="absolute left-0 inset-y-0 w-2 bg-[#456448] opacity-80" aria-hidden="true" />
        <div className="flex justify-between items-center mb-5"><BookOpen size={21} className="text-[#53754a]" /><span className="text-[10px] tracking-widest text-[#9aa78c]">คู่มือ {String(index + 1).padStart(2, '0')}</span></div>
        <h2 className="text-base font-semibold text-[#214b38]">{READER_TITLES[c.id] || c.nameTh}</h2>
        <p className="text-xs text-[#788477] mt-2">{items.filter(i => i.category === c.id).length} หัวข้อ · เปิดอ่านทั้งหมวด</p><ChevronRight size={16} className="absolute right-4 bottom-5 text-[#91a17e]" />
      </button>)}
      {!categories.length && <p className="text-sm text-[#788477]">ยังไม่มีข้อมูลในคลังความรู้</p>}
    </div> : <>
      <button onClick={() => setCategory(null)} className="flex gap-1 items-center text-xs text-[#597662] mb-5"><ArrowLeft size={14} />กลับไปหมวดความรู้</button>
      <article className="knowledge-book-reader bg-[#fffef9] rounded-2xl border border-[#dce3d3] shadow-[0_5px_22px_rgba(41,66,35,.06)] overflow-hidden">
        <header className="px-5 sm:px-9 py-7 bg-[#edf2e6] border-b border-[#dce3d3]"><Leaf size={23} className="text-[#6e8c5b] mb-3" /><p className="text-[11px] text-[#788477] mb-2">คู่มือความรู้บ้านโฮม</p><h2 className="text-xl font-semibold text-[#214b38]">{title}</h2><p className="text-xs text-[#788477] mt-2">รวม {chapters.reduce((n,c) => n+c.items.length, 0)} หัวข้อ · เลื่อนอ่านต่อเนื่องได้ทั้งหมวด</p></header>
        <nav aria-label="สารบัญหมวดความรู้" className="mx-5 sm:mx-9 py-5 border-b border-[#e1e5d9]"><h3 className="text-sm font-semibold text-[#597662] mb-3">สารบัญ</h3><div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">{chapters.map(chapter => <div key={chapter.title} className="space-y-2"><p className="text-xs text-[#788477]">{chapter.title}</p>{chapter.items.map(item => <a key={item.id} href={`#${anchorFor(item.id)}`} onClick={() => onRead(item)} className="block text-xs leading-6 text-[#456448] hover:underline underline-offset-4">{readerHeading(item.title)}</a>)}</div>)}</div></nav>
        <div className="px-5 sm:px-9 pb-8">{chapters.map(chapter => <section key={chapter.title} className="pt-8"><h3 className="text-lg font-semibold text-[#214b38] mb-6">{chapter.title}</h3>
          {chapter.items.map(item => <section id={anchorFor(item.id)} key={item.id} data-reader-item={item.id} className="scroll-mt-24 pb-8 mb-8 border-b border-[#e6e9df] last:mb-0 last:border-0">
            <div className="flex flex-wrap items-center gap-2 mb-4"><h4 className="text-base font-semibold text-[#293e31]">{readerHeading(item.title)}</h4>{!isCustomerReady(item) && <span className="text-[10px] rounded-full bg-[#f3ebdc] text-[#836d43] px-2 py-1">ข้อมูลสำหรับพนักงาน</span>}</div>
            <div className="space-y-4 text-sm leading-8 whitespace-pre-wrap break-words">{readerParagraphs(item).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              {item.competitorData && <div className="space-y-3">{Object.entries(item.competitorData).filter(([,v]) => v).map(([k,v]) => <p key={k}><span className="font-medium">{competitorLabels[k] || k}: </span>{Array.isArray(v) ? v.join('\n') : String(v)}</p>)}</div>}
              {(item.nextActions || []).length > 0 && <div className="border-l-2 border-[#cbd9bd] pl-4"><h5 className="text-sm font-medium text-[#597662] mb-1">แนวทางปฏิบัติ</h5>{item.nextActions.map((text,index) => <p key={index}>{text}</p>)}</div>}
            </div>
            <KnowledgeMedia item={item} />
            <p className="text-[11px] leading-6 text-[#8a9383] mt-4">แหล่งข้อมูล: {item.sourceDoc || 'ฐานความรู้กลาง'}{item.docSection ? ` · ${item.docSection}` : ''} · อัปเดต {item.lastUpdated || 'ไม่ระบุ'}{item.dataStatus ? ` · ${item.dataStatus}` : ''}</p>
          </section>)}
        </section>)}</div>
        <footer className="px-5 sm:px-9 py-5 bg-[#f5f6ee] border-t border-[#e1e5d9] text-xs leading-6 text-[#788477]"><p className="font-medium mb-1">เอกสารต้นทางของหมวดนี้</p>{sources.map(source => <p key={source}>{source}</p>)}</footer>
      </article>
    </>}
  </div>;
}
