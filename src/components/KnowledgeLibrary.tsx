import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Leaf, Utensils, ZoomIn, ZoomOut } from 'lucide-react';
import type { KnowledgeItem } from '../types';

type Block = { type: 'paragraph' | 'heading'; text: string } | { type: 'table'; rows: string[][] } | { type: 'image'; src: string };
type BookData = { source: string; chapters?: { title: string; blocks: Block[] }[]; pages?: { title: string; src: string }[] };
const BOOKS = [
  { id: 'menu', title: 'เมนูอาหารบ้านโฮม', description: 'เปิดดูรูปอาหาร ราคา และเมนูตามหน้าต้นฉบับ', source: 'เล่มเมนู อาหารบ้านโฮม BH 2026 (ใช้).pdf', audience: 'ส่งให้ลูกค้าได้', count: '26 หน้า', match: 'เล่มเมนู', icon: Utensils },
  { id: 'services', title: 'ความรู้และบริการบ้านโฮม', description: 'ทำความรู้จักบ้านโฮมและบริการต่าง ๆ อ่านเป็นบท', source: 'Knowledge Mapping ของ BU บ้านโฮม(2).docx', audience: 'ข้อมูลสำหรับพนักงาน', count: 'คู่มือความรู้', match: 'Knowledge Mapping', icon: Leaf },
  { id: 'customer-service', title: 'คู่มือบริการลูกค้าและการจอง', description: 'หลักการบริการ ขั้นตอนการจอง และแนวทางปฏิบัติ', source: 'BH_Customer_Service_Handbook_2026(2).docx', audience: 'ข้อมูลสำหรับพนักงาน', count: 'คู่มือหน้างาน', match: 'BH_Customer_Service_Handbook', icon: BookOpen },
];
export function KnowledgeLibrary({ items, onRead }: { items: KnowledgeItem[]; onRead: (item: KnowledgeItem) => void }) {
  const [bookId, setBookId] = useState<string | null>(null);
  const [data, setData] = useState<BookData | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const pageTop = useRef<HTMLDivElement>(null);
  const imageViewport = useRef<HTMLDivElement>(null);
  const book = BOOKS.find(b => b.id === bookId);
  useEffect(() => {
    setData(null); setError(''); setPage(0); setZoom(1);
    if (!bookId) return;
    const controller = new AbortController();
    void fetch(`/knowledge-books/${bookId}/content.json`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('โหลดเล่มไม่สำเร็จ กรุณาลองเปิดใหม่');
      const content: BookData = await response.json();
      if (!(content.pages?.length || content.chapters?.length)) throw new Error('ไม่พบเนื้อหาในเล่ม');
      if (!controller.signal.aborted) setData(content);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message || 'โหลดเล่มไม่สำเร็จ'); });
    return () => controller.abort();
  }, [bookId]);
  const count = data?.pages?.length || data?.chapters?.length || 0;
  const entries = data?.pages || data?.chapters || [];
  const navigate = (next: number) => {
    setPage(Math.max(0, Math.min(count - 1, next))); setZoom(1);
    imageViewport.current?.scrollTo({ top: 0, left: 0 });
    pageTop.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
  };
  const open = (id: string) => {
    setBookId(id);
    const target = BOOKS.find(b => b.id === id);
    const sourceItem = items.find(i => i.sourceDoc?.includes(target?.match || ''));
    if (sourceItem) onRead(sourceItem);
  };
  const pager = <div className="flex items-center justify-between gap-3 py-4">
    <button disabled={page === 0} onClick={() => navigate(page - 1)} className="inline-flex items-center gap-1 text-sm text-[#456448] disabled:opacity-30"><ChevronLeft size={17} />ย้อนกลับ</button>
    <span className="text-xs text-[#788477]">{bookId === 'menu' ? 'หน้า' : 'บท'} {page + 1} / {count}</span>
    <button disabled={page >= count - 1} onClick={() => navigate(page + 1)} className="inline-flex items-center gap-1 text-sm text-[#456448] disabled:opacity-30">ถัดไป<ChevronRight size={17} /></button>
  </div>;
  return <div className="knowledge-library max-w-5xl mx-auto px-4 sm:px-8 py-6 text-[#293e31]">
    {!book ? <>
      <h1 className="text-xl font-semibold text-[#214b38]">คลังความรู้</h1>
      <p className="text-sm text-[#788477] mt-2 mb-7">เลือกเล่มที่อยากอ่าน แล้วค่อย ๆ เปิดดูได้เลย</p>
      <div className="grid md:grid-cols-3 gap-5">{BOOKS.map(b => <button key={b.id} onClick={() => open(b.id)} aria-label={`เปิดอ่าน ${b.title}`} className="knowledge-book-cover group text-left relative rounded-2xl border border-[#d6dfce] bg-[#fffef9] overflow-hidden shadow-[0_5px_20px_rgba(33,75,56,.06)] hover:shadow-[0_8px_25px_rgba(33,75,56,.1)] transition-shadow">
        <span className="absolute inset-y-0 left-0 w-2 bg-[#456448]" aria-hidden="true" />
        {b.id === 'menu' ? <div className="h-52 bg-[#e7edde] overflow-hidden"><img src="/knowledge-books/menu/01.webp" alt="ปกรูปเล่มเมนูบ้านโฮม" className="w-full h-full object-cover object-top" /></div> : <div className="h-52 bg-[#f5efdf] overflow-hidden"><img src={`/knowledge-books/${b.id}/cover.webp`} alt={`หน้าปก${b.title}`} loading="lazy" className="w-full h-full object-contain" /></div>}
        <div className="p-5 pl-6"><span className="text-[10px] text-[#788477]">{b.audience}</span><h2 className="text-base font-semibold text-[#214b38] mt-2">{b.title}</h2><p className="text-xs leading-6 text-[#788477] mt-2">{b.description}</p><span className="inline-flex gap-1 items-center text-xs text-[#456448] mt-5">เปิดอ่าน<ChevronRight size={14} /></span></div>
      </button>)}</div>
    </> : <>
      <button onClick={() => setBookId(null)} className="flex items-center gap-1 text-xs text-[#597662] mb-5"><ArrowLeft size={15} />กลับไปเลือกเล่ม</button>
      <header className="mb-5"><span className="text-[10px] rounded-full bg-[#e8eedf] px-2 py-1 text-[#597662]">{book.audience}</span><h1 className="text-xl font-semibold text-[#214b38] mt-3">{book.title}</h1><p className="text-[11px] leading-6 text-[#788477] mt-1 break-words">ไฟล์ต้นทาง: {book.source}</p></header>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : !data ? <p role="status" className="text-sm text-[#788477]">กำลังเปิดเล่ม…</p> : <>
        <details className="rounded-xl border border-[#d6dfce] bg-[#fffef9] px-4 py-3 mb-4"><summary className="cursor-pointer text-sm text-[#597662]">สารบัญ · {count} {bookId === 'menu' ? 'หน้า' : 'บท'}</summary><nav aria-label="สารบัญเล่ม" className="grid sm:grid-cols-2 gap-2 mt-4">{entries.map((entry, index) => <button key={index} onClick={() => navigate(index)} className={`text-left text-xs leading-6 rounded-lg px-2 py-1 ${page === index ? 'bg-[#e9efdf] text-[#214b38]' : 'text-[#597662] hover:bg-[#f4f5ed]'}`}>{entry.title}</button>)}</nav></details>
        <div ref={pageTop} className="scroll-mt-24">{pager}</div>
        {data.pages ? <>
          <div className="flex justify-end gap-3 mb-3"><button aria-label="ย่อหน้าเมนู" disabled={zoom <= 1} onClick={() => setZoom(z => Math.max(1, z - .5))} className="text-[#597662] disabled:opacity-30"><ZoomOut size={18} /></button><span className="text-xs text-[#788477]">{Math.round(zoom * 100)}%</span><button aria-label="ขยายหน้าเมนู" disabled={zoom >= 3} onClick={() => setZoom(z => Math.min(3, z + .5))} className="text-[#597662] disabled:opacity-30"><ZoomIn size={18} /></button></div>
          <div ref={imageViewport} className="knowledge-menu-page rounded-xl border border-[#d6dfce] bg-[#fffef9] overflow-auto max-h-[80dvh] shadow-sm"><img key={page} src={data.pages[page].src} alt={`เมนูอาหารบ้านโฮม หน้า ${page + 1}`} style={{ width: `${zoom * 100}%`, maxWidth: 'none' }} /></div>
        </> : <article className="knowledge-book-reader rounded-2xl border border-[#d6dfce] bg-[#fffef9] shadow-[0_5px_22px_rgba(41,66,35,.06)] px-5 sm:px-9 py-7">
          <h2 className="text-lg font-semibold text-[#214b38] mb-6">{data.chapters![page].title}</h2>
          <div className="space-y-5 text-sm leading-8 break-words">{data.chapters![page].blocks.map((block, index) => block.type === 'paragraph' ? <p key={index} className="whitespace-pre-wrap">{block.text}</p> : block.type === 'heading' ? <h3 key={index} className="font-semibold text-[#456448] pt-3">{block.text}</h3> : block.type === 'image' ? <img key={index} src={block.src} alt={`ภาพจากเอกสาร ${data.chapters![page].title}`} loading="lazy" className="max-w-full h-auto rounded-lg" /> : <div key={index} className="overflow-x-auto rounded-xl border border-[#dfe5d8]"><table className="w-full text-xs leading-6"><tbody>{block.rows.map((row, r) => <tr key={r} className={r === 0 ? 'bg-[#edf2e6] font-medium' : 'border-t border-[#e5e8df]'}>{row.map((cell, c) => <td key={c} className="align-top min-w-[100px] p-3 whitespace-pre-wrap">{cell}</td>)}</tr>)}</tbody></table></div>)}</div>
        </article>}
        {pager}
      </>}
    </>}
  </div>;
}
