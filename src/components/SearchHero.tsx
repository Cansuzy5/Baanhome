import React from 'react';
import { Search, Sparkles, X, ArrowRight } from 'lucide-react';
import { KnowledgeCategory } from '../types';
import nongHomeMascotImg from '../assets/images/nong_home_mascot_1788840555434.jpg';
import tropicalVillaImg from '../assets/images/tropical_resort_villa_1788840573847.jpg';

interface SearchHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSubmitSearch: (query?: string) => void;
  selectedCategory: KnowledgeCategory | 'all';
  onSelectCategory: (cat: KnowledgeCategory | 'all') => void;
  staffName: string;
  isSearching: boolean;
}

const PRIMARY_CATEGORY_CHIPS: { id: KnowledgeCategory; label: string }[] = [
  { id: 'business-profile', label: 'Business Profile' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'resort-knowledge', label: 'Resort Knowledge' },
  { id: 'pool-villa', label: 'Pool Villa' },
  { id: 'mini-mice', label: 'Mini MICE' },
  { id: 'promotion-package', label: 'Promotion & Package' },
];

export const SearchHero: React.FC<SearchHeroProps> = ({
  searchQuery,
  onSearchChange,
  onSubmitSearch,
  selectedCategory,
  onSelectCategory,
  staffName,
  isSearching,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmitSearch();
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0F241A] via-[#163828] to-[#1D4532] text-white rounded-3xl mx-3 sm:mx-6 my-3 shadow-xl border border-[#26533D]">
      {/* Background Resort Villa Texture with overlay gradient */}
      <div 
        className="absolute inset-0 z-0 opacity-25 mix-blend-luminosity bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: `url(${tropicalVillaImg})` }}
      />
      
      {/* Soft gradient masks for seamless atmosphere */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#0F241A] via-[#163828]/90 to-transparent pointer-events-none" />
      <div className="absolute -right-16 -top-16 w-96 h-96 bg-[#346F50]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left: Mascot Character "น้องโฮม" */}
          <div className="hidden md:flex lg:col-span-3 items-center justify-center relative select-none">
            <div className="relative">
              {/* Mascot Portrait Card with glow and floral/resort theme */}
              <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full p-1.5 bg-gradient-to-tr from-[#C59B3F] via-[#2F674B] to-[#78B490] shadow-2xl">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#163828] border-2 border-white/20">
                  <img
                    src={nongHomeMascotImg}
                    alt="น้องโฮม ผู้ช่วยบริการบ้านโฮม"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>

              {/* Speech bubble / Friendly Callout */}
              <div className="absolute -top-3 -right-6 sm:-right-8 bg-[#FAF8F3] text-[#1B3D2F] px-3.5 py-1.5 rounded-2xl rounded-bl-xs shadow-lg border border-[#E5DFD1] text-xs font-medium z-20 animate-bounce-short">
                <div className="font-handwriting text-base text-[#1E4331] leading-none flex items-center gap-1">
                  <span>ถามได้ทุกเรื่องเลยนะคะ</span>
                  <span className="text-rose-600 font-bold">♡</span>
                </div>
              </div>

              {/* Resort staff badge */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#0F241A]/90 backdrop-blur-md text-[#E8C57D] text-[11px] font-semibold px-3 py-1 rounded-full border border-[#C59B3F]/40 whitespace-nowrap shadow-md">
                🌿 น้องโฮม &middot; Concierge
              </div>
            </div>
          </div>

          {/* Center: Search & Headings */}
          <div className="lg:col-span-9 text-center lg:text-left">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 text-[#E5D2A6] text-xs font-semibold backdrop-blur-md mb-3 border border-[#E5D2A6]/30">
              <Sparkles className="w-3.5 h-3.5 text-[#E5BF77]" />
              <span>
                {staffName ? `สวัสดีคุณ ${staffName} 🙏 ยินดีต้อนรับ` : 'ผู้ช่วยอัจฉริยะสำหรับทีมบ้านโฮม'} &middot; พร้อมให้บริการ
              </span>
            </div>

            {/* Main Headline */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-2 font-heading leading-tight">
              ค้นหาคำตอบจากฐานความรู้บ้านโฮม
            </h2>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-[#C8DCB0]/90 max-w-2xl mx-auto lg:mx-0 mb-6 leading-relaxed">
              ค้นหาจาก Google Docs ทั้ง 12 หมวดหมู่ ได้ทั้งคำตอบสรุป ข้อมูลอ้างอิง และข้อความพร้อมส่งลูกค้า
            </p>

            {/* Big Search Bar (Hero Highlight) */}
            <div className="relative max-w-3xl mx-auto lg:mx-0">
              <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-[#FAF9F5] rounded-2xl sm:rounded-full shadow-2xl border-2 border-[#E7DFCE] focus-within:border-[#C59B3F] focus-within:ring-4 focus-within:ring-[#C59B3F]/25 transition-all p-1.5">
                
                <div className="flex items-center flex-1 px-3 py-1 sm:py-0">
                  <Search className="w-5 h-5 text-[#3D644F] shrink-0 mr-2.5" />
                  <input
                    id="hero-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="พิมพ์คำถาม เช่น สัตว์เลี้ยงเข้าพักได้ไหม, พูลวิลล่าเลี้ยงส่งได้กี่โมง, แพ็กเกจสัมมนา..."
                    className="w-full bg-transparent py-2.5 text-sm sm:text-base text-[#1A2E22] placeholder:text-[#829688] focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => onSearchChange('')}
                      className="p-1.5 text-[#889B8F] hover:text-[#1E3D2F] hover:bg-[#EBE5D8] rounded-full transition-colors cursor-pointer mr-1"
                      title="ล้างข้อความ"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Primary Button */}
                <button
                  id="hero-submit-search-btn"
                  type="button"
                  onClick={() => onSubmitSearch()}
                  disabled={!searchQuery.trim() || isSearching}
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl sm:rounded-full font-bold text-sm transition-all cursor-pointer shadow-md ${
                    searchQuery.trim() && !isSearching
                      ? 'bg-gradient-to-r from-[#B8860B] via-[#C9972E] to-[#B58231] hover:from-[#A67808] hover:to-[#A67425] text-white active:scale-98 hover:shadow-lg'
                      : 'bg-[#C9972E]/80 hover:bg-[#B8860B] text-white/90'
                  }`}
                >
                  {isSearching ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-200" />
                      <span>ถามน้องโฮม</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Category Chips */}
            <div className="mt-4 flex items-center justify-center lg:justify-start gap-1.5 sm:gap-2 flex-wrap text-xs">
              <span className="text-[#BDD1C3] text-xs font-medium mr-1">
                ค้นหาตามหมวด:
              </span>

              {PRIMARY_CATEGORY_CHIPS.map((chip) => {
                const isActive = selectedCategory === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => onSelectCategory(isActive ? 'all' : chip.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#FAF8F3] text-[#1B3D2F] font-bold shadow-xs ring-2 ring-[#C59B3F]'
                        : 'bg-white/10 hover:bg-white/20 text-[#E2EDE5] border border-white/10'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}

              {selectedCategory !== 'all' ? (
                <button
                  type="button"
                  onClick={() => onSelectCategory('all')}
                  className="px-2.5 py-1 rounded-full text-[11px] text-[#E8C57D] hover:underline cursor-pointer bg-white/5"
                >
                  (แสดงทุกหมวด)
                </button>
              ) : (
                <span className="text-[11px] text-[#A6C4B0] italic hidden sm:inline">
                  (ค้นหาครอบคลุมทุกหมวดอัตโนมัติ)
                </span>
              )}
            </div>

            {/* Quick Popular Questions */}
            <div className="mt-3 flex items-center justify-center lg:justify-start gap-1.5 flex-wrap text-xs">
              <span className="text-[#A2BCAB] text-[11px] font-medium mr-1 flex items-center gap-1">
                <span>💡 ตัวอย่างคำถาม:</span>
              </span>
              {[
                { label: '🐶 สัตว์เลี้ยงเข้าพัก', query: 'สัตว์เลี้ยงเข้าพักได้ไหม' },
                { label: '🏛️ ห้องประชุม & MICE', query: 'มีห้องประชุมจุได้กี่คน' },
                { label: '🍳 บุฟเฟต์อาหารเช้า', query: 'อาหารเช้าเปิดกี่โมงมีอะไรบ้าง' },
                { label: '⏰ เช็คอิน-เช็คเอาท์', query: 'เช็คอินและเช็คเอาท์กี่โมง' },
                { label: '🧾 ขอใบกำกับภาษี', query: 'ขอใบเสร็จและใบกำกับภาษีได้ไหม' },
                { label: '🍾 ค่าเปิดขวด', query: 'ค่าเปิดขวดนำเครื่องดื่มเข้าเท่าไหร่' },
                { label: '🚗 ที่จอดรถ & แผนที่', query: 'มีที่จอดรถไหม อยู่แถวไหน' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    onSearchChange(item.query);
                    onSubmitSearch(item.query);
                  }}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-white/10 hover:bg-white/20 text-[#F1E8D9] border border-white/15 transition-all cursor-pointer hover:border-[#E8C57D]"
                >
                  {item.label}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Right Slogan Quote */}
        <div className="hidden lg:block absolute bottom-4 right-8 text-right text-xs text-[#BED2C4]/80 font-handwriting text-base">
          “ บ้านโฮม มากกว่าที่พัก คือ ความรู้สึกดีๆ ♡ ”
        </div>
      </div>
    </section>
  );
};
