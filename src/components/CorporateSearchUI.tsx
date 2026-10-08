import React, { useState, useEffect, useRef } from 'react';
import { useSearchAnalytics } from '../hooks/useSearchAnalytics';
import type { StaffProfile } from '../types';
import { 
  Search, Filter, Loader2, Sparkles, SlidersHorizontal, CheckCircle2, Clock, 
  MapPin, CreditCard, Building2, User, Zap, X, Waves, UtensilsCrossed, 
  Hotel, Users, ArrowRight, Image as ImageIcon, Copy, Check,
  HeartHandshake, CalendarCheck, ClipboardList, HelpCircle, Tag,
  Briefcase, Target, FileText, Folder, Bot, ToggleLeft, ToggleRight,
  ShieldCheck, Compass, ShieldAlert, FileSpreadsheet
} from 'lucide-react';
import { KnowledgeCategory, CategoryMeta, KnowledgeItem } from '../types';
import { KNOWLEDGE_CATEGORIES } from '../data/categories';
import { executeInstantSearch, askGemini, SearchResult, SearchOutcome } from '../utils/searchEngine';
import { StructuredAnswerCard } from './StructuredAnswerCard';
import { isCustomerReady, isCompetitorKnowledge } from '../utils/knowledgeFilter';


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

const renderCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case 'Building2': return <Building2 className="w-4 h-4 text-[#2D5A43] shrink-0" />;
    case 'UtensilsCrossed': return <UtensilsCrossed className="w-4 h-4 text-[#2D5A43] shrink-0" />;
    case 'Hotel': return <Hotel className="w-4 h-4 text-[#2D5A43] shrink-0" />;
    case 'Waves': return <Waves className="w-4 h-4 text-[#2D5A43] shrink-0" />;
    case 'Users': return <Users className="w-4 h-4 text-[#2D5A43] shrink-0" />;
    case 'Tag': return <Tag className="w-4 h-4 text-[#2D5A43] shrink-0" />;
    case 'HeartHandshake': return <HeartHandshake className="w-4 h-4 text-[#2D5A43] shrink-0" />;
    case 'CalendarCheck': return <CalendarCheck className="w-4 h-4 text-[#2D5A43] shrink-0" />;
    case 'ClipboardList': return <ClipboardList className="w-4 h-4 text-[#2D5A43] shrink-0" />;
    case 'HelpCircle': return <HelpCircle className="w-4 h-4 text-[#2D5A43] shrink-0" />;
    case 'Briefcase': return <Briefcase className="w-4 h-4 text-[#2D5A43] shrink-0" />;
    case 'Sparkles': return <Sparkles className="w-4 h-4 text-[#2D5A43] shrink-0" />;
    case 'Target': return <Target className="w-4 h-4 text-[#2D5A43] shrink-0" />;
    case 'FileText': return <FileText className="w-4 h-4 text-[#2D5A43] shrink-0" />;
    default: return <Folder className="w-4 h-4 text-[#2D5A43] shrink-0" />;
  }
};

export const CorporateSearchUI: React.FC<CorporateSearchUIProps> = ({
  searchQuery,
  onSearchChange,
  activeKnowledgeItems,
  staffName,
  analyticsStaff,
  onRecordLog,
  onAskUnanswered,
  onOpenSheetsSync,
  isUsingCustomSheet = false,
}) => {
  const query = searchQuery || '';
  const setQuery = onSearchChange || (() => {});
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | 'all'>('all');

  const [isSearching, setIsSearching] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [searchOutcome, setSearchOutcome] = useState<SearchOutcome | null>(null);
  const [aiAnswer, setAiAnswer] = useState<{ text: string; references: string[] } | null>(null);
  const [copiedAi, setCopiedAi] = useState(false);


  // Auto AI mode preference (Default false for maximum speed and zero errors)
  const [autoAiMode, setAutoAiMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('baanhome_auto_ai_mode') === 'true';
    } catch {
      return false;
    }
  });

  const aiAbortControllerRef = useRef<AbortController | null>(null);
  const logTimerRef = useRef<any>(null);
  const analyticsSnapshot = useRef<{ query: string; count: number } | null>(null);
  useSearchAnalytics(query, analyticsStaff, () =>
    analyticsSnapshot.current?.query === query ? analyticsSnapshot.current.count : null
  );

  const handleToggleAutoAi = (enabled: boolean) => {
    setAutoAiMode(enabled);
    try {
      localStorage.setItem('baanhome_auto_ai_mode', enabled ? 'true' : 'false');
    } catch {}
  };

  // Immediate debounce for client-side search (50ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 50);
    return () => clearTimeout(timer);
  }, [query]);

  // Stop Search & Clear Handler
  const handleStopSearch = () => {
    // 1. Abort any in-flight AI call
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
      aiAbortControllerRef.current = null;
    }
    // 2. Clear pending log timer
    if (logTimerRef.current) {
      clearTimeout(logTimerRef.current);
      logTimerRef.current = null;
    }
    // 3. Reset all search states
    setQuery('');
    setDebouncedQuery('');
    setSearchOutcome(null);
    setAiAnswer(null);
    setIsSearching(false);
    setIsAiLoading(false);
  };

  // Cancel only the AI generation
  const handleCancelAi = () => {
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
      aiAbortControllerRef.current = null;
    }
    setIsAiLoading(false);
  };

  // Trigger AI Generation on-demand or auto
  const handleTriggerAi = async (overrideQuery?: string, customResults?: SearchResult[]) => {
    const q = (overrideQuery !== undefined ? overrideQuery : debouncedQuery).trim();
    if (!q) return;

    const resultsToUse = customResults || searchOutcome?.results || [];
    // No early return when nothing matches: น้องโฮม AI may still answer within the Baanhome role scope
    const customerReadyResults = resultsToUse.filter(r => isCustomerReady(r.item));

    // Abort previous call if still running
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    aiAbortControllerRef.current = controller;

    setIsAiLoading(true);
    setAiAnswer(null);

    try {
      const aiRes = await askGemini(q, customerReadyResults, controller.signal);
      if (!controller.signal.aborted) {
        setAiAnswer({ text: aiRes.answer, references: aiRes.referenceIds });
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError' && !controller.signal.aborted) {
        setAiAnswer({
          text: 'ขณะนี้ระบบน้องโฮม AI อยู่ระหว่างเตรียมความพร้อม โปรดดูข้อความที่พร้อมส่งลูกค้าจากรายการด้านล่างได้เลยนะคะ 💚',
          references: []
        });
      }
    } finally {
      if (aiAbortControllerRef.current === controller) {
        setIsAiLoading(false);
        aiAbortControllerRef.current = null;
      }
    }
  };

  // 1. INSTANT LOCAL SEARCH (Runs in <1ms, 0 API calls, 0 errors, displays immediately)
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchOutcome(null);
      setAiAnswer(null);
      setIsSearching(false);
      setIsAiLoading(false);
      if (aiAbortControllerRef.current) {
        aiAbortControllerRef.current.abort();
        aiAbortControllerRef.current = null;
      }
      return;
    }

    // Client-side instant search
    const outcome = executeInstantSearch(debouncedQuery, activeKnowledgeItems);
    analyticsSnapshot.current = { query: debouncedQuery, count: outcome.results?.length || 0 };
    
    // Apply filters
    let filteredResults = outcome.results || [];
    if (selectedCategory !== 'all') {
      filteredResults = filteredResults.filter(r => r?.item?.category === selectedCategory);
    }


    const finalOutcome = { ...outcome, results: filteredResults };
    setSearchOutcome(finalOutcome);
    setIsSearching(false);

    // Reset previous AI answer when query changes
    setAiAnswer(null);

    // Throttled logging (only log 1.5s after user stops typing, avoiding keystroke spam)
    if (logTimerRef.current) {
      clearTimeout(logTimerRef.current);
    }
    if (finalOutcome.results.length > 0 && debouncedQuery.trim().length >= 2) {
      logTimerRef.current = setTimeout(() => {
        onRecordLog(debouncedQuery, finalOutcome.results[0] || null);
      }, 1500);
    }

    // 2. AUTO AI MODE (Only if explicitly enabled by user)
    if (autoAiMode) {
      const aiTimer = setTimeout(() => {
        handleTriggerAi(debouncedQuery, finalOutcome.results);
      }, 600);
      return () => clearTimeout(aiTimer);
    }
  }, [debouncedQuery, activeKnowledgeItems, selectedCategory, autoAiMode]);

  const handleCopyAiAnswer = () => {
    if (!aiAnswer?.text) return;
    navigator.clipboard.writeText(aiAnswer.text);
    setCopiedAi(true);
    setTimeout(() => setCopiedAi(false), 2000);
  };

  const resultCount = searchOutcome?.results.length || 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <section className="qa-hero mb-6 py-6 sm:py-10 text-center">
        <p className="text-sm text-[#637b6b] mb-3">น้องโฮม · ผู้ช่วยบ้านโฮม</p>
        <h1 className="text-2xl sm:text-4xl font-bold text-[#1B3D2F]">วันนี้ให้โฮมช่วยเรื่องไหน?</h1>
        <p className="text-sm text-[#637b6b] mt-3">ถามเรื่องบริการ ลูกค้า หรือข้อมูลภายในได้ในช่องเดียว</p>
        <form className="max-w-3xl mx-auto mt-6 flex items-center gap-2 rounded-2xl border border-[#d5dfd8] bg-white p-2 shadow-sm" onSubmit={(e) => { e.preventDefault(); setDebouncedQuery(query); }}>
          <Search className="w-5 h-5 text-[#2D5A43] ml-2 shrink-0" />
          <input id="main-search-input" aria-label="ถามน้องโฮม" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') handleStopSearch(); }} placeholder="ถามโฮมได้เลย เช่น ราคาอาหาร หรือเวลาเช็คอิน" className="min-w-0 flex-1 bg-transparent py-3 text-base text-[#1B3D2F] outline-none" />
          {query.trim() && <button id="stop-search-btn" type="button" onClick={handleStopSearch} aria-label="หยุดค้นหาและล้างคำค้น" className="p-2 text-[#637b6b] rounded-lg hover:bg-[#f5f1e8]"><X className="w-4 h-4" /></button>}
          <button type="submit" className="rounded-xl bg-[#1B3D2F] text-white px-4 sm:px-6 py-3 text-sm font-semibold shrink-0">ถามโฮม</button>
        </form>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {['เวลาเช็คอิน', 'สัตว์เลี้ยง', 'อาหารเช้า', 'โอนเงินมัดจำ', 'พูลวิลล่า', 'แผนที่'].map(q => <button key={q} onClick={() => setQuery(q)} className="text-xs px-3 py-2 rounded-full border border-[#ded7c8] hover:bg-white text-[#415649]">{q}</button>)}
        </div>
      </section>
      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-[#415649]">
          <Filter className="w-4 h-4" /> หมวดความรู้
          <select aria-label="หมวดความรู้" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as KnowledgeCategory | 'all')} className="max-w-[220px] sm:max-w-[360px] bg-white border border-[#ded7c8] rounded-xl px-3 py-2">
            <option value="all">ทั้งหมด</option>
            {KNOWLEDGE_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.nameTh}</option>)}
          </select>
        </label>
        {onOpenSheetsSync && <button onClick={onOpenSheetsSync} className="text-xs text-[#2D5A43] flex items-center gap-2 py-2"><FileSpreadsheet className="w-4 h-4" />นำเข้า / ซิงค์ Google Sheets {isUsingCustomSheet ? '· เชื่อมต่อแล้ว' : ''}</button>}
      </div>
      <div className="qa-content">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          {!debouncedQuery ? (
            // Default Question & Answer View (Clean Q&A focus)
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-[#E3DACB] shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h2 className="text-base font-bold text-[#1B3D2F] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#B8871E]" /> คำถามที่พบบ่อยพร้อมคำตอบ
                    </h2>
                    <p className="text-xs text-[#708477] mt-0.5">
                      แตะหัวข้อเพื่อดูคำตอบพร้อมส่งลูกค้า หรือพิมพ์ค้นหาคำถามในช่องด้านบน
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 bg-[#EEF5EC] text-[#2D5A43] rounded-lg self-start sm:self-auto whitespace-nowrap">
                    พร้อมส่งลูกค้าทันที
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'checkin', label: 'เวลา Check-in & Check-out', q: 'เวลาเช็คอิน' },
                    { id: 'bank', label: 'โอนเงินมัดจำ / เลขบัญชี', q: 'โอนเงินมัดจำ' },
                    { id: 'location', label: 'พิกัด Google Maps & ที่ตั้ง', q: 'แผนที่ ที่ตั้ง' },
                    { id: 'pet', label: 'นโยบายสัตว์เลี้ยง (Pet-Friendly)', q: 'สัตว์เลี้ยง' },
                    { id: 'pool', label: 'พูลวิลล่า & สระว่ายน้ำ', q: 'พูลวิลล่า' },
                    { id: 'breakfast', label: 'เวลาอาหารเช้า', q: 'อาหารเช้า' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setQuery(item.q)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border bg-[#FAF8F3] hover:bg-[#EEF5EC] text-[#1B3D2F] border-[#DED7C8] hover:border-[#2D5A43] flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap active:scale-95"
                    >
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Featured Structured Answer Card */}
              {(() => {
                const defaultItem = activeKnowledgeItems.find(k => k.id === 'BH-010') 
                  || activeKnowledgeItems.find(k => k.id === 'kb-checkin-checkout')
                  || activeKnowledgeItems.find(k => k.title.includes('Check-in') || k.title.includes('เช็คอิน'))
                  || activeKnowledgeItems[0];

                if (!defaultItem) return null;

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#708477] px-1">
                      <span>ข้อมูลจากคลังความรู้</span>
                      <span className="text-[#2D5A43] font-mono">รหัส: {defaultItem.id}</span>
                    </div>

                    <StructuredAnswerCard
                      item={defaultItem}
                      questionText={defaultItem.title}
                      onFeedback={() => {}}
                      matchedKeywords={['check-in', 'check-out', '14:00', '12:00']}
                    />
                  </div>
                );
              })()}
            </div>
          ) : (
            <>
              {/* AI Answer Section */}
              {Boolean(searchOutcome && debouncedQuery.trim()) && (() => {
                const isCompetitorSearch = searchOutcome?.results?.[0] && isCompetitorKnowledge(searchOutcome.results[0].item);

                return (
                  <div>
                    {aiAnswer ? (
                      /* AI Answer Box with Result */
                      <div className="bg-gradient-to-br from-[#1B3D2F] via-[#244F3C] to-[#1B3D2F] text-white p-5 sm:p-6 rounded-3xl shadow-lg relative overflow-hidden border border-[#2D5A43]">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#3D7058]/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                        
                        <div className="relative z-10">
                          <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                isCompetitorSearch 
                                  ? 'bg-[#EF4444]/20 border border-[#EF4444]/50 text-[#FCA5A5]' 
                                  : 'bg-[#E8C57D]/20 border border-[#E8C57D]/40 text-[#E8C57D]'
                              }`}>
                                {isCompetitorSearch ? <ShieldAlert className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-base text-[#FDF9F3]">
                                    {isCompetitorSearch ? 'กลยุทธ์รับมือคู่แข่ง (น้องโฮม AI)' : 'คำตอบจากน้องโฮม AI'}
                                  </h3>
                                  {isCompetitorSearch ? (
                                    <span className="px-2 py-0.5 bg-[#EF4444]/30 border border-[#EF4444]/50 text-[#FCA5A5] text-[10px] font-extrabold rounded-md uppercase tracking-wider">
                                      Staff Only (ห้ามส่งลูกค้า)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-[#E8C57D]/20 text-[#E8C57D] text-[10px] font-bold rounded-md">Custom AI</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#A3B8AC]">
                                  {isCompetitorSearch 
                                    ? 'ข้อมูลวิเคราะห์คู่แข่ง & จุดขายสำหรับพนักงานภายใน (ห้ามส่งต่อให้ลูกค้าภายนอก)' 
                                    : resultCount === 0
                                      ? 'ตอบจากความรู้ทั่วไปในขอบเขตงานบ้านโฮม ไม่ได้มาจากฐานข้อมูล โปรดตรวจสอบก่อนส่งลูกค้า'
                                      : 'ประมวลผลจากฐานข้อมูลบ้านโฮม พร้อมส่งให้ลูกค้า'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Re-ask / Refresh button */}
                              <button
                                type="button"
                                onClick={() => handleTriggerAi()}
                                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-[#D3E3D8] text-xs rounded-xl font-medium transition-colors"
                                title="เรียบเรียงใหม่อีกครั้ง"
                              >
                                เรียบเรียงใหม่
                              </button>

                              {/* Copy AI Answer Button */}
                              <button
                                type="button"
                                onClick={handleCopyAiAnswer}
                                className={`flex items-center gap-1.5 px-4 py-2 active:scale-95 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                                  isCompetitorSearch
                                    ? 'bg-[#B91C1C] hover:bg-[#991B1B] text-white'
                                    : 'bg-[#E8C57D] hover:bg-[#D8B468] text-[#1B3D2F]'
                                }`}
                                title={isCompetitorSearch ? 'คัดลอกข้อมูลสรุปสำหรับพนักงาน' : 'คัดลอกคำตอบของน้องโฮม AI เพื่อส่งลูกค้า'}
                              >
                                {copiedAi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedAi ? 'คัดลอกสำเร็จแล้ว!' : isCompetitorSearch ? 'คัดลอกสรุปพนักงาน' : 'คัดลอกคำตอบ'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Confidential warning if competitor */}
                          {isCompetitorSearch && (
                            <div className="mb-3 px-3.5 py-2.5 bg-[#7F1D1D]/50 border border-[#F87171]/40 rounded-xl flex items-center gap-2.5 text-xs text-[#FECACA]">
                              <ShieldAlert className="w-4 h-4 text-[#FCA5A5] shrink-0" />
                              <span><strong>ข้อมูลความรู้ของพนักงาน (ห้ามส่งลูกค้า):</strong> ชุดข้อมูลนี้ใช้สำหรับวิเคราะห์คู่แข่งและชูจุดแข็งของบ้านโฮมในการปิดการขายเท่านั้นค่ะ</span>
                            </div>
                          )}
                          
                          <div className="bg-[#122A20]/70 backdrop-blur-xs p-4 rounded-2xl border border-[#2D5A43]/60">
                            <div className="text-[#F9FCF8] leading-relaxed whitespace-pre-wrap text-sm font-medium">
                              {aiAnswer.text}
                            </div>
                          </div>

                          {aiAnswer.references && aiAnswer.references.length > 0 && (
                            <details className="mt-3 pt-2.5 border-t border-[#2A5240] text-xs text-[#A3B8AC]"><summary className="cursor-pointer mb-2">ดูแหล่งอ้างอิง</summary>
                              <span>อ้างอิงจากข้อมูลรหัส:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {aiAnswer.references.map(ref => (
                                  <span key={ref} className="px-2 py-0.5 rounded bg-[#0D261A] text-[#E8C57D] font-mono text-[11px] border border-[#2D5A43]">
                                    {ref}
                                  </span>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    ) : isAiLoading ? (
                    /* AI Loading State with Cancel button */
                    <div className="bg-gradient-to-r from-[#1B3D2F] to-[#244F3C] text-white p-4 rounded-2xl border border-[#2D5A43] flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-[#E8C57D]" />
                        <div>
                          <div className="text-sm font-semibold text-[#FDF9F3]">น้องโฮม AI กำลังเรียบเรียงคำตอบ...</div>
                          <div className="text-xs text-[#A3B8AC]">สังเคราะห์ข้อมูลที่ตรงประเด็นสำหรับส่งลูกค้า</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelAi}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-[#F5C2C2] text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>ยกเลิก</span>
                      </button>
                    </div>
                  ) : (
                    /* AI Prompt Banner (On-Demand) */
                    <div className="bg-white p-4 rounded-2xl border border-[#E5EFE2] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#EEF5EC] border border-[#D3E3D8] flex items-center justify-center text-[#2D5A43] shrink-0">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#1B3D2F]">น้องโฮม AI (Custom AI Assistant)</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-[#EEF5EC] text-[#2D5A43] rounded-md">พร้อมช่วยสรุป</span>
                          </div>
                          <p className="text-xs text-[#708477] mt-0.5">
                            {resultCount === 0
                              ? 'ไม่พบข้อมูลตรงในฐานความรู้ ให้น้องโฮม AI ช่วยตอบในขอบเขตงานบ้านโฮมไหมคะ?'
                              : 'ต้องการให้ AI ช่วยเรียบเรียงข้อความสุภาพสำหรับส่งลูกค้าจากข้อมูลด้านล่างไหมคะ?'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <label className="flex items-center gap-1.5 text-xs text-[#708477] cursor-pointer" title="เปิดเพื่อให้ AI สรุปคำตอบอัตโนมัติเมื่อพิมพ์คำค้นหา">
                          <input
                            type="checkbox"
                            checked={autoAiMode}
                            onChange={(e) => handleToggleAutoAi(e.target.checked)}
                            className="rounded text-[#2D5A43] focus:ring-[#2D5A43]"
                          />
                          <span>สรุปอัตโนมัติ</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleTriggerAi()}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2D5A43] hover:bg-[#234734] active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#E8C57D]" />
                          <span>ถามน้องโฮม AI</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

              {/* Search Results */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm font-semibold text-[#708477]">
                  <span>ผลลัพธ์การค้นหา ({resultCount} รายการ)</span>
                  {searchOutcome?.intentData && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-[#EEF5EC] text-[#2D5A43] rounded-full">
                      <Zap className="w-3.5 h-3.5" /> บริการ: {searchOutcome.intentData.serviceType}
                    </span>
                  )}
                </div>

                {resultCount === 0 && !isSearching && (
                  <div className="bg-white p-10 rounded-2xl border border-[#F0E5D3] text-center">
                    <h3 className="text-lg font-bold text-[#1B3D2F] mb-2">ไม่พบข้อมูลที่ตรงกับคำค้นหา</h3>
                    <p className="text-[#708477] text-sm mb-6">กรุณาลองเปลี่ยนคำค้นหา หรือใช้คำที่สั้นลง</p>
                    <button 
                      onClick={() => onAskUnanswered(debouncedQuery)}
                      className="px-6 py-2.5 bg-[#916B2D] hover:bg-[#7D5C26] text-white rounded-xl font-semibold shadow-md transition-colors"
                    >
                      ส่งคำถามให้ผู้ดูแลระบบอัปเดต
                    </button>
                  </div>
                )}

                {searchOutcome?.results.map((result, idx) => (
                  <StructuredAnswerCard
                    key={`${result.item.id}-${idx}`}
                    item={result.item}
                    questionText={debouncedQuery}
                    onFeedback={() => {}}
                    matchedKeywords={result.matchedKeywords}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

