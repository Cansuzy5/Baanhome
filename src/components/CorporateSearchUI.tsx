import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Check, Copy, FileSpreadsheet, Home, Loader2, RotateCcw, X } from 'lucide-react';
import type { KnowledgeItem, StaffProfile } from '../types';
import type { SearchResult } from '../utils/searchEngine';
import { askConversation } from '../utils/aiConversation';
import { useSearchAnalytics } from '../hooks/useSearchAnalytics';
import { BotanicalBackdrop } from './BotanicalBackdrop';
import { KnowledgeMedia } from './KnowledgeMedia';
import { clearConversation, readConversation, saveConversation, MAX_CONVERSATION_TURNS, type ConversationTurn } from '../utils/qaConversation';
interface CorporateSearchUIProps {
  activeKnowledgeItems: KnowledgeItem[]; staffName: string; analyticsStaff?: StaffProfile;
  onAddKnowledge?: () => void;
  onRecordLog: (query: string, result: SearchResult | null) => void; onAskUnanswered: (query: string) => void;
  searchQuery?: string; onSearchChange?: (q: string) => void; onOpenSheetsSync?: () => void; isUsingCustomSheet?: boolean;
}
export const CorporateSearchUI: React.FC<CorporateSearchUIProps> = ({ activeKnowledgeItems, staffName, analyticsStaff, onRecordLog, onAskUnanswered, searchQuery = '', onSearchChange, onOpenSheetsSync, isUsingCustomSheet, onAddKnowledge }) => {
  const accountId = analyticsStaff?.id || '';
  const [turns, setTurns] = useState<ConversationTurn[]>(() => readConversation(accountId));
  const turnsRef = useRef(turns);
  const [localDraft, setLocalDraft] = useState('');
  const draft = onSearchChange ? searchQuery : localDraft;
  const setDraft = onSearchChange || setLocalDraft;
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState('');
  const [notice, setNotice] = useState('');
  const [analyticsQuestion, setAnalyticsQuestion] = useState('');
  const countRef = useRef(0);
  const requestRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(activeKnowledgeItems); itemsRef.current = activeKnowledgeItems;
  useSearchAnalytics(analyticsQuestion, analyticsStaff, () => countRef.current);
  const publish = (next: ConversationTurn[]) => { turnsRef.current = next.slice(-MAX_CONVERSATION_TURNS); setTurns(turnsRef.current); saveConversation(accountId, turnsRef.current); };
  useEffect(() => () => requestRef.current?.abort(), []);
  const followBottom = useRef(true);
  const scrollToComposer = () => bottomRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'end' });
  useEffect(() => {
    const onScroll = () => { followBottom.current = document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 240; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { if (turns.length && followBottom.current) requestAnimationFrame(scrollToComposer); }, [turns.length, turns.at(-1)?.aiAnswer, loading]);
  const generate = async (turn: ConversationTurn, previous: ConversationTurn[]) => {
    if (requestRef.current) return;
    const controller = new AbortController(); requestRef.current = controller; setLoading(turn.id); setNotice('');
    publish(turnsRef.current.map(t => t.id === turn.id ? { ...t, error: undefined } : t));
    try {
      const reply = await askConversation(turn.question, itemsRef.current, previous, controller.signal);
      if (controller.signal.aborted || requestRef.current !== controller) return;
      // References are checked again against current records on rendering.
      publish(turnsRef.current.map(t => t.id === turn.id ? { ...t, sourceIds: reply.referenceIds, aiAnswer: { text: reply.customerAnswer || reply.staffAnswer, references: reply.referenceIds, ...reply } } : t));
      countRef.current = reply.referenceIds.length;
      const item = itemsRef.current.find(i => i.id === reply.referenceIds[0]);
      onRecordLog(turn.question, item ? { item, score: 1, matchedKeywords: [] } : null);
    } catch (error: any) {
      if (!controller.signal.aborted && requestRef.current === controller) publish(turnsRef.current.map(t => t.id === turn.id ? { ...t, error: error.message || 'AI ตอบไม่สำเร็จ กรุณาลองใหม่' } : t));
    } finally { if (requestRef.current === controller) { requestRef.current = null; setLoading(null); } }
  };
  const submit = () => {
    const question = draft.trim().slice(0, 1000); if (!question || requestRef.current) return;
    const previous = turnsRef.current;
    const turn: ConversationTurn = { id: crypto.randomUUID(), question, searchQuery: question, sourceIds: [], createdAt: new Date().toISOString(), usedContext: previous.length > 0 };
    followBottom.current = true;
    publish([...previous, turn]); setDraft(''); countRef.current = 0; setAnalyticsQuestion(question); void generate(turn, previous);
  };
  const reset = () => { requestRef.current?.abort(); requestRef.current = null; setLoading(null); setDraft(''); setNotice(''); clearConversation(accountId); turnsRef.current = []; setTurns([]); };
  const copy = async (id: string, text: string) => { try { await navigator.clipboard.writeText(text); setCopied(id); } catch { setNotice('คัดลอกไม่สำเร็จ กรุณาลองใหม่'); } };
  return <div className="qa-garden-shell"><BotanicalBackdrop /><div className="qa-conversation max-w-4xl mx-auto px-4 sm:px-8 py-6">
    <header className="flex justify-between items-center border-b border-[#e0e5da] pb-4"><div><h1 className="text-xl font-semibold text-[#214b38]">ถาม–ตอบ</h1><p className="text-xs text-[#788477] mt-1">น้องโฮม · {staffName}</p></div><div className="flex items-center gap-2">{onAddKnowledge && <button onClick={onAddKnowledge} className="qa-copy-button text-xs text-[#597662]">เพิ่มข้อมูล/คำตอบ</button>}{turns.length > 0 && <button aria-label="เริ่มบทสนทนาใหม่" onClick={reset} className="p-2 text-[#788477]"><RotateCcw size={17} /></button>}</div></header>
    <div className="space-y-6 py-6 min-h-[380px]">
      {!turns.length && <div className="rounded-2xl bg-[#fffdf8] border border-[#e0e5da] p-5 shadow-sm"><Home size={22} className="text-[#214b38] mb-3" /><h2 className="text-lg font-medium text-[#214b38]">วันนี้ให้โฮมช่วยเรื่องไหน?</h2><p className="text-sm text-[#788477] mt-2">ถามเรื่องห้องพัก อาหาร จัดเลี้ยง หรือข้อมูลพนักงานได้เลย</p></div>}
      {turns.map((turn, index) => {
        const refs = activeKnowledgeItems.filter(i => turn.sourceIds.includes(i.id));
        return <section key={turn.id} data-turn-id={turn.id} aria-label={`คำถาม ${index + 1}`} className="qa-chat-turn space-y-3">
          <div className="flex justify-end"><p className="qa-question-bubble max-w-[88%] rounded-2xl rounded-tr-md bg-[#e5ecdf] border border-[#d7e0d0] shadow-sm px-4 py-3 text-sm leading-6 text-[#293e31] break-words">{turn.question}</p></div>
          <div className="qa-answer-bubble rounded-2xl rounded-tl-md bg-[#fffdf8] border border-[#dfe5d8] shadow-[0_3px_14px_rgba(33,75,56,0.05)] p-4 sm:p-5">
            <div className="qa-assistant-signature"><span className="qa-home-avatar"><Home size={17} /></span><span>น้องโฮม</span><span className="qa-avatar-spark" aria-hidden="true">✦</span></div>
            {loading === turn.id ? <p role="status" className="flex gap-2 items-center text-sm text-[#597662]"><Loader2 size={15} className="animate-spin" />น้องโฮมกำลังตอบ…</p> : turn.error ? <div role="alert"><p className="text-sm text-red-700">{turn.error}</p><button onClick={() => void generate(turn, turns.slice(0, index))} className="text-xs underline text-[#597662] mt-3">ลองใหม่</button></div> : turn.aiAnswer ? <div className="qa-answer-content">
              {([{ key: 'customer', text: turn.aiAnswer.customerAnswer, label: 'ส่งให้ลูกค้าได้' }, { key: 'staff', text: turn.aiAnswer.staffAnswer, label: 'ข้อมูลสำหรับพนักงาน' }]).filter(s => s.text).map(section => <div key={section.key} className="mb-4 last:mb-0"><span className={`inline-block rounded-full px-2 py-1 text-[10px] ${section.key === 'customer' ? 'bg-[#eaf2e4] text-[#375f38]' : 'bg-[#f4ebda] text-[#806638]'}`}>{section.label}</span><p className="text-sm leading-7 whitespace-pre-wrap break-words text-[#293e31] mt-3">{section.text}</p><button onClick={() => void copy(`${turn.id}-${section.key}`, section.text!)} className="qa-copy-button inline-flex items-center gap-1 text-xs text-[#597662] mt-3">{copied === `${turn.id}-${section.key}` ? <Check size={13} /> : <Copy size={13} />}คัดลอกคำตอบ{turn.aiAnswer?.customerAnswer && turn.aiAnswer?.staffAnswer ? (section.key === 'customer' ? 'สำหรับลูกค้า' : 'สำหรับพนักงาน') : ''}</button></div>)}
              {refs.filter(i => i.images?.length || i.imageUrl || i.category === 'restaurant').slice(0, 3).map(item => <KnowledgeMedia key={item.id} item={item} />)}
              {refs.length > 0 && <details className="mt-4 pt-3 border-t border-[#e4e8df]"><summary className="cursor-pointer text-xs text-[#788477]">แหล่งอ้างอิงและข้อมูลเพิ่มเติม</summary><div className="space-y-4 mt-3">{refs.map(item => <div key={item.id} className="text-xs text-[#597662]"><p className="font-medium">{item.title}</p><p className="whitespace-pre-wrap leading-6 mt-1">{item.summary}</p><p className="mt-1 text-[#788477]">{item.sourceDoc}{item.docSection ? ` · ${item.docSection}` : ''}</p>{!(item.images?.length || item.imageUrl || item.category === 'restaurant') && <KnowledgeMedia item={item} />}</div>)}</div></details>}
            </div> : <div className="text-sm text-[#788477]"><p>คำถามจากประวัติ · กดตอบใหม่เพื่อใช้ข้อมูลล่าสุด</p><button onClick={() => void generate(turn, turns.slice(0, index))} className="text-xs underline mt-2 text-[#597662]">ตอบคำถามนี้</button></div>}
          </div>
        </section>;
      })}
    </div>
    <div ref={bottomRef} className="qa-composer relative mt-4 pb-4 md:pb-2">
      <form onSubmit={e => { e.preventDefault(); submit(); }} className="qa-input-surface flex items-center gap-2 rounded-2xl border border-[#d6dfce] bg-[#fffefb] p-3 shadow-[0_6px_24px_rgba(37,57,41,0.1)]">
        <input id="main-search-input" aria-label="ถามน้องโฮม" onFocus={() => { followBottom.current = true; scrollToComposer(); }} maxLength={1000} value={draft} onChange={e => setDraft(e.target.value)} placeholder="ถามโฮมได้เลย…" className="min-w-0 flex-1 bg-transparent p-2 text-base md:text-sm text-[#293e31] outline-none" />
        {draft && <button type="button" aria-label="ล้างคำถาม" onClick={() => setDraft('')} className="text-[#788477]"><X size={17} /></button>}
        <button type="submit" aria-label="ส่งคำถาม" disabled={!draft.trim() || !!loading} className="qa-send-button w-10 h-10 rounded-full bg-[#214b38] text-white disabled:opacity-35 flex items-center justify-center"><ArrowUp size={20} /></button>
      </form>
      {notice && <p role="alert" className="mt-2 text-xs text-red-700">{notice}</p>}
      {onOpenSheetsSync && <button onClick={onOpenSheetsSync} className="mt-3 inline-flex items-center gap-1 text-[11px] text-[#788477]"><FileSpreadsheet size={12} />นำเข้า / ซิงค์ Google Sheets{isUsingCustomSheet ? ' · เชื่อมต่อแล้ว' : ''}</button>}
    </div>
  </div></div>;
};
