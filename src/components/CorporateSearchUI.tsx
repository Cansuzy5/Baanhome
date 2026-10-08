import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, BookOpen, Check, Copy, FileSpreadsheet, Home, Loader2, RotateCcw, Sparkles, X } from 'lucide-react';
import type { KnowledgeCategory, KnowledgeItem, StaffProfile } from '../types';
import { KNOWLEDGE_CATEGORIES } from '../data/categories';
import { askGemini, executeInstantSearch, type SearchResult } from '../utils/searchEngine';
import { isCustomerReady } from '../utils/knowledgeFilter';
import { useSearchAnalytics } from '../hooks/useSearchAnalytics';
import { StructuredAnswerCard } from './StructuredAnswerCard';
import { clearConversation, readConversation, recentAiQuestions, resolveFollowup, saveConversation, MAX_CONVERSATION_TURNS, type ConversationTurn } from '../utils/qaConversation';

interface CorporateSearchUIProps {
  activeKnowledgeItems: KnowledgeItem[];
  staffName: string;
  analyticsStaff?: StaffProfile;
  onRecordLog: (query: string, result: SearchResult | null) => void;
  onAskUnanswered: (query: string) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onOpenSheetsSync?: () => void;
  isUsingCustomSheet?: boolean;
}

export const CorporateSearchUI: React.FC<CorporateSearchUIProps> = ({
  activeKnowledgeItems, staffName, analyticsStaff, onRecordLog, onAskUnanswered,
  searchQuery = '', onSearchChange, onOpenSheetsSync, isUsingCustomSheet = false,
}) => {
  const accountId = analyticsStaff?.id || '';
  const preferenceKey = `baanhome_auto_ai_mode:${encodeURIComponent(accountId)}`;
  const [turns, setTurns] = useState<ConversationTurn[]>(() => readConversation(accountId));
  const turnsRef = useRef(turns);
  const [localDraft, setLocalDraft] = useState('');
  const draft = onSearchChange ? searchQuery : localDraft;
  const setDraft = onSearchChange || setLocalDraft;
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | 'all'>('all');
  const [autoAiMode, setAutoAiMode] = useState(() => {
    try { return localStorage.getItem(preferenceKey) === 'true'; } catch { return false; }
  });
  const [loadingTurnId, setLoadingTurnId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [analyticsQuestion, setAnalyticsQuestion] = useState('');
  const countRef = useRef(0);
  const requestRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialQuery = useRef(searchQuery);
  useSearchAnalytics(analyticsQuestion, analyticsStaff, () => countRef.current);
  const itemsRef = useRef(activeKnowledgeItems);
  itemsRef.current = activeKnowledgeItems;

  const publish = (next: ConversationTurn[]) => {
    turnsRef.current = next.slice(-MAX_CONVERSATION_TURNS);
    setTurns(turnsRef.current);
    saveConversation(accountId, turnsRef.current);
  };
  useEffect(() => () => { requestRef.current?.abort(); }, []);
  useEffect(() => { if (turns.length) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [turns.length]);

  const resultsFor = (query: string) => executeInstantSearch(query, itemsRef.current).results.filter(r => selectedCategory === 'all' || r.item.category === selectedCategory);

  const generateAnswer = async (turn: ConversationTurn, results: SearchResult[], previous: ConversationTurn[]) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoadingTurnId(turn.id);
    setNotice('');
    try {
      const answer = await askGemini(turn.question, results, controller.signal, turn.usedContext ? recentAiQuestions(previous, itemsRef.current) : []);
      if (controller.signal.aborted || requestRef.current !== controller) return;
      // Do not restore a cleared thread or overwrite a newer reply.
      publish(turnsRef.current.map(t => t.id === turn.id ? { ...t, aiAnswer: { text: answer.answer, references: answer.referenceIds } } : t));
    } catch (error: any) {
      if (!controller.signal.aborted) setNotice(error?.message || 'AI ตอบไม่สำเร็จ กรุณาลองใหม่หรือดูข้อมูลจากคลังความรู้');
    } finally {
      if (requestRef.current === controller) { requestRef.current = null; setLoadingTurnId(null); }
    }
  };

  const submitQuestion = (value = draft) => {
    const question = value.trim().slice(0, 1000);
    if (!question) return;
    requestRef.current?.abort();
    requestRef.current = null;
    setLoadingTurnId(null);
    const previous = turnsRef.current;
    const context = resolveFollowup(question, previous, itemsRef.current);
    const results = resultsFor(context.query);
    const turn: ConversationTurn = {
      id: crypto.randomUUID(), question, searchQuery: context.query,
      sourceIds: results.map(r => r.item.id).slice(0, 30), createdAt: new Date().toISOString(), usedContext: context.usedContext,
    };
    publish([...previous, turn]);
    setDraft('');
    setAnalyticsQuestion(question);
    countRef.current = results.length;
    if (results.length) onRecordLog(question, results[0]);
    if (autoAiMode) void generateAnswer(turn, results, previous);
  };

  useEffect(() => {
    // Existing links from the knowledge library can open a query directly.
    if (initialQuery.current.trim()) { submitQuestion(initialQuery.current); initialQuery.current = ''; }
  }, []);

  const resetThread = () => {
    requestRef.current?.abort(); requestRef.current = null;
    setLoadingTurnId(null); setNotice(''); setDraft('');
    clearConversation(accountId); turnsRef.current = []; setTurns([]);
  };
  const copyAnswer = async (id: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(id); }
    catch { setNotice('คัดลอกไม่สำเร็จ กรุณาเลือกข้อความแล้วคัดลอกอีกครั้ง'); }
  };

  return (
    <div className="qa-conversation max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-5 border-b border-[#e5e1d7]">
        <div>
          <h1 className="text-xl font-semibold text-[#214b38]">ถาม–ตอบ</h1>
          <p className="text-xs text-[#788477] mt-1">ผู้ช่วยค้นข้อมูลบ้านโฮม · {staffName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-[#526758]">
            <BookOpen className="w-4 h-4" />
            <select aria-label="หมวดความรู้" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value as KnowledgeCategory | 'all')} className="max-w-[180px] sm:max-w-[250px] rounded-xl border border-[#e2ded4] bg-[#fffdf8] px-3 py-2">
              <option value="all">หมวดความรู้ทั้งหมด</option>
              {KNOWLEDGE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.nameTh}</option>)}
            </select>
          </label>
          {turns.length > 0 && <button type="button" onClick={resetThread} title="เริ่มบทสนทนาใหม่" aria-label="เริ่มบทสนทนาใหม่" className="p-2 rounded-lg text-[#788477] hover:bg-[#eceee7]"><RotateCcw className="w-4 h-4" /></button>}
        </div>
      </div>

      <div className="space-y-9 py-6 min-h-[340px] sm:min-h-[420px]">
        {!turns.length && <div className="pt-8 sm:pt-12 pb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#e7eee5] text-[#214b38] flex items-center justify-center shrink-0"><Home className="w-5 h-5" /></div>
            <div>
              <h2 className="text-xl font-semibold text-[#214b38]">วันนี้ให้โฮมช่วยเรื่องไหน?</h2>
              <p className="text-sm leading-7 text-[#728073] mt-2">ถามเรื่องห้องพัก อาหาร จัดเลี้ยง หรือข้อมูลภายในได้เลย</p>
              <p className="text-xs text-[#8a9388] mt-2">ค้นจากฐานความรู้ก่อน · ใช้ AI เมื่อกดให้ช่วยตอบหรือเปิดโหมดอัตโนมัติ</p>
            </div>
          </div>
        </div>}
        {turns.map((turn, index) => {
          // Resolve saved references against today's knowledge, never old copied data.
          const results = executeInstantSearch(turn.searchQuery, activeKnowledgeItems).results.filter(r => turn.sourceIds.includes(r.item.id));
          const aiSource = results.find(r => isCustomerReady(r.item));
          const primary = turn.aiAnswer && aiSource ? aiSource : results[0];
          const additional = results.filter(r => r.item.id !== primary?.item.id);
          const priorTurns = turns.slice(0, index);
          return <section key={turn.id} data-turn-id={turn.id} aria-label={`คำถาม ${index + 1}`} className="space-y-5">
            <div className="flex justify-end">
              <div className="max-w-[88%] sm:max-w-[75%] rounded-2xl rounded-tr-md bg-[#e8ece4] px-4 py-3 text-sm leading-6 text-[#293e31] break-words">{turn.question}</div>
            </div>
            <div className="flex items-start gap-3 sm:gap-5">
              <div className="w-9 h-9 rounded-full bg-[#e6ece3] text-[#214b38] flex items-center justify-center shrink-0"><Home className="w-4 h-4" /></div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[#214b38] mb-3 flex flex-wrap items-center gap-2">น้องโฮม <span className="text-[11px] font-normal text-[#8a9388]">{turn.aiAnswer ? 'คำตอบ AI' : 'ข้อมูลจากคลังความรู้'}</span></div>
                {turn.usedContext && <p className="text-[11px] text-[#728073] mb-3">ใช้เรื่องจากคำถามก่อนหน้า · หากเปลี่ยนเรื่อง ให้ระบุชื่อเรื่องใหม่</p>}
                {primary ? <StructuredAnswerCard compact item={primary.item} answerText={turn.aiAnswer?.text} questionText={turn.question} matchedKeywords={primary.matchedKeywords} onFeedback={() => {}} />
                : <div className="space-y-3 text-sm leading-7 text-[#526758]">
                  {turn.aiAnswer ? <><p className="whitespace-pre-wrap">{turn.aiAnswer.text}</p><p className="text-xs text-[#9a7a44]">แนวทางทั่วไปจาก AI · ไม่พบข้อมูลอ้างอิงในฐานความรู้</p><button className="text-xs flex items-center gap-1" onClick={() => void copyAnswer(turn.id, turn.aiAnswer!.text)}>{copied === turn.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}คัดลอกคำตอบ</button></>
                  : <><p>ยังไม่พบข้อมูลที่ตรงกับคำถาม ลองระบุชื่อเมนูหรือบริการเพิ่มเติมได้ค่ะ</p><button onClick={() => onAskUnanswered(turn.question)} className="text-xs underline underline-offset-4">ส่งคำถามให้ผู้ดูแลระบบอัปเดต</button></>}
                </div>}
                {additional.length > 0 && <details className="mt-4 border-t border-[#e2e3db] pt-3"><summary className="text-xs text-[#687c6c] cursor-pointer">ข้อมูลที่เกี่ยวข้องอีก {additional.length} รายการ</summary><div className="space-y-5 mt-4">{additional.map(r => <StructuredAnswerCard compact key={r.item.id} item={r.item} questionText={turn.question} onFeedback={() => {}} matchedKeywords={r.matchedKeywords} />)}</div></details>}
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                  {loadingTurnId === turn.id ? <><span role="status" className="flex items-center gap-2 text-[#597662]"><Loader2 className="w-3.5 h-3.5 animate-spin" />AI กำลังเรียบเรียง…</span><button onClick={() => { requestRef.current?.abort(); requestRef.current = null; setLoadingTurnId(null); }} className="text-[#8c7060]">ยกเลิก</button></>
                  : <button type="button" onClick={() => void generateAnswer(turn, results, priorTurns)} className="flex items-center gap-1.5 text-[#2d5a43] hover:underline underline-offset-4"><Sparkles className="w-3.5 h-3.5" />{turn.aiAnswer ? 'เรียบเรียงใหม่' : 'ให้ AI ช่วยตอบ'}</button>}
                  {turn.aiAnswer?.references.length ? <details><summary className="cursor-pointer text-[#788477]">แหล่งอ้างอิง AI</summary><p className="pt-2">{turn.aiAnswer.references.join(', ')}</p></details> : null}
                </div>
              </div>
            </div>
          </section>;
        })}
      </div>

      <div ref={bottomRef} className="qa-composer sticky bottom-[68px] md:bottom-4 z-20 pt-3 pb-2 bg-gradient-to-b from-[#f6f2e9]/95 to-[#f6f2e9]">
        <div className="mb-3 flex flex-wrap gap-2">
          {(!turns.length ? ['เวลาเช็คอิน', 'เมนูอาหาร', 'พูลวิลล่า', 'จัดเลี้ยง สัมมนา'] : ['มีเงื่อนไขเพิ่มเติมไหม', 'มีอาหารเช้าไหม', 'ดูข้อมูลห้องพัก']).map(q => <button type="button" key={q} onClick={() => setDraft(q)} className="rounded-full border border-[#dcded4] bg-[#faf9f4] hover:bg-white px-3 py-2 text-xs text-[#657465]">{q}</button>)}
        </div>
        <form onSubmit={e => { e.preventDefault(); submitQuestion(); }} className="rounded-2xl border border-[#dedfd6] bg-white p-3 sm:p-4 shadow-[0_6px_24px_rgba(37,57,41,0.08)]">
          <div className="flex items-center gap-2">
            <input id="main-search-input" aria-label="ถามน้องโฮม" value={draft} maxLength={1000} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setDraft(''); requestRef.current?.abort(); requestRef.current = null; setLoadingTurnId(null); } }} placeholder="ถามโฮมได้เลย…" className="min-w-0 flex-1 bg-transparent py-2 px-1 text-base md:text-sm text-[#293e31] outline-none" />
            {draft && <button id="stop-search-btn" type="button" aria-label="ล้างคำถาม" onClick={() => setDraft('')} className="p-2 text-[#8a9388]"><X className="w-4 h-4" /></button>}
            <button type="submit" aria-label="ส่งคำถาม" disabled={!draft.trim()} className="rounded-xl w-10 h-10 bg-[#214b38] hover:bg-[#173c2b] disabled:opacity-35 text-white flex items-center justify-center shrink-0"><ArrowUp className="w-5 h-5" /></button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 mt-2 border-t border-[#f0f0ea] pt-2">
            <span className="text-[10px] sm:text-[11px] text-[#8a9388]">ประวัติส่วนตัวในเครื่องนี้ · {autoAiMode ? 'AI ทำงานเมื่อส่งคำถาม' : 'ค้นฐานความรู้ก่อน'}</span>
            <label className="text-xs text-[#788477] flex items-center gap-2 cursor-pointer"><span>AI อัตโนมัติ</span><input aria-label="AI อัตโนมัติ" type="checkbox" checked={autoAiMode} onChange={e => { const enabled = e.target.checked; setAutoAiMode(enabled); try { localStorage.setItem(preferenceKey, String(enabled)); } catch {} }} className="accent-[#214b38]" /></label>
          </div>
        </form>
        {notice && <p role="alert" className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 mt-2">{notice}</p>}
        {onOpenSheetsSync && <button onClick={onOpenSheetsSync} className="mt-3 text-[11px] text-[#788477] flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5" />นำเข้า / ซิงค์ Google Sheets {isUsingCustomSheet ? '· เชื่อมต่อแล้ว' : ''}</button>}
      </div>
    </div>
  );
};
