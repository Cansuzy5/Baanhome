import React, { useState, useEffect } from 'react';
import { 
  Copy, Check, FileText, CheckCircle2, AlertTriangle, ExternalLink, Calendar, 
  Camera, Image as ImageIcon, Maximize2, Sparkles, ImagePlus, ShieldAlert, Target, TrendingUp
} from 'lucide-react';
import { KnowledgeItem } from '../types';
import { KNOWLEDGE_CATEGORIES } from '../data/categories';
import { isCustomerReady, isCompetitorKnowledge } from '../utils/knowledgeFilter';
import { getItemImages } from '../utils/itemImageManager';
import { EditImageModal } from './EditImageModal';
import { ImageLightboxModal } from './ImageLightboxModal';

interface StructuredAnswerCardProps {
  item: KnowledgeItem;
  questionText: string;
  onFeedback: (type: any, note?: string) => void;
  matchedKeywords?: string[];
}

export const StructuredAnswerCard: React.FC<StructuredAnswerCardProps> = ({ item, matchedKeywords }) => {
  const [copied, setCopied] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [images, setImages] = useState<string[]>(() => getItemImages(item, false));
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const catMeta = KNOWLEDGE_CATEGORIES.find(c => c.id === item.category);
  const isCompetitor = isCompetitorKnowledge(item);
  const customerReady = !isCompetitor && isCustomerReady(item);

  // Sync images if item changes or global custom images are updated
  useEffect(() => {
    setImages(getItemImages(item, false));
    const handleUpdate = () => {
      setImages(getItemImages(item, false));
    };
    window.addEventListener('baan_home_images_updated', handleUpdate);
    return () => window.removeEventListener('baan_home_images_updated', handleUpdate);
  }, [item]);

  const handleCopy = () => {
    const textToCopy = item.customerMessage || item.summary || '';
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySummary = () => {
    if (!item.summary) return;
    navigator.clipboard.writeText(item.summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleCopyImageUrl = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedImage(true);
    setTimeout(() => setCopiedImage(false), 2000);
  };

  const primaryImage = images[activeImageIndex] || images[0];

  return (
    <div data-knowledge-id={item.id} className={`bg-white rounded-3xl border shadow-sm overflow-hidden transition-all ${customerReady ? 'border-[#D5DFD8] hover:border-[#916B2D]' : 'border-[#F0E5D3] opacity-90'}`}>
      <div className="p-5 sm:p-6">
        
        {/* Header section */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-1 bg-[#F9FCF8] border border-[#E5EFE2] text-[#2D5A43] text-[10px] font-bold rounded-md font-mono">
                {item.id}
              </span>
              {catMeta && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F8F6F0] text-[#7D5C26] text-[10px] font-bold rounded-md">
                  {catMeta.nameTh}
                </span>
              )}
              {isCompetitor ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-[10px] font-bold rounded-md uppercase tracking-wider">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#DC2626]" /> ข้อมูลความรู้ของพนักงาน (ห้ามส่งลูกค้า)
                </span>
              ) : customerReady ? (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-[#E2F0E0] text-[#1B3E2D] text-[10px] font-bold rounded-md uppercase tracking-wider">
                  <CheckCircle2 className="w-3 h-3" /> พร้อมส่งลูกค้า
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-[#FDE8E8] text-[#9B1C1C] text-[10px] font-bold rounded-md uppercase tracking-wider">
                  <AlertTriangle className="w-3 h-3" /> ข้อมูลภายใน / รอยืนยัน
                </span>
              )}
              {images.length > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-[#EEF5EC] text-[#2D5A43] text-[10px] font-semibold rounded-md">
                  <ImageIcon className="w-3 h-3" /> มีรูปภาพ ({images.length})
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-[#1B3D2F] leading-snug">{item.title}</h3>
          </div>

          {/* Quick Image Action on Header */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F4F8F5] hover:bg-[#E5EFE8] text-[#2D5A43] border border-[#D5DFD8] rounded-xl text-xs font-semibold transition-all shadow-2xs hover:shadow-xs"
              title="หน้างานสามารถเปลี่ยนหรือเพิ่มรูปภาพได้"
            >
              <Camera className="w-3.5 h-3.5 text-[#2D5A43]" />
              <span>{images.length > 0 ? 'แก้ไขรูปภาพ' : 'เพิ่มรูปภาพ'}</span>
            </button>
          </div>
        </div>

        {/* Content Section */}
        {isCompetitor ? (
          /* ========================================================================= */
          /* COMPETITOR KNOWLEDGE: STRICTLY INTERNAL STAFF VIEW (NO CUSTOMER MESSAGES) */
          /* ========================================================================= */
          <div className="mt-3 space-y-4">
            {/* Prominent Confidential Warning Banner */}
            <div className="p-4 rounded-2xl bg-[#FFF5F5] border border-[#FECACA] flex items-start gap-3.5 text-[#991B1B] shadow-2xs">
              <div className="p-2 rounded-xl bg-[#FEE2E2] shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5 text-[#DC2626]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h4 className="font-bold text-sm text-[#991B1B]">
                    ข้อมูลความรู้สำหรับพนักงานเท่านั้น (INTERNAL STAFF KNOWLEDGE)
                  </h4>
                  <span className="px-2 py-0.5 bg-[#DC2626] text-white text-[10px] font-extrabold rounded-md uppercase tracking-wider">
                    ห้ามส่งต่อให้ลูกค้าเด็ดขาด
                  </span>
                </div>
                <p className="text-xs text-[#7F1D1D] leading-relaxed">
                  ชุดข้อมูลนี้เป็นข้อมูลวิเคราะห์คู่แข่ง เปรียบเทียบจุดแข็ง-จุดอ่อน และเตรียมจุดขายสำหรับทีมงานบ้านโฮม เพื่อใช้เตรียมตัวปิดการจองกับลูกค้า ห้ามคัดลอกหรือส่งต่อข้อความวิเคราะห์นี้ให้ลูกค้าภายนอกโดยตรงนะคะ
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Competitor Overview & Details */}
              <div className="space-y-4">
                {item.summary && (
                  <div className="bg-[#FFFDF9] border border-[#F0E5D3] rounded-2xl p-5 shadow-2xs">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-[#7D5C26] uppercase tracking-wider flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-[#C59B3F]" /> สรุปข้อมูลคู่แข่งและการเปรียบเทียบ
                      </h4>
                      <button
                        type="button"
                        onClick={handleCopySummary}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#F8F6F0] text-[#7D5C26] border border-[#E5DFD1] rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                        title="คัดลอกสรุปสำหรับศึกษาภายใน"
                      >
                        {copiedSummary ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedSummary ? 'คัดลอกแล้ว' : 'คัดลอกสรุปภายใน'}</span>
                      </button>
                    </div>
                    <p className="text-sm text-[#422006] leading-relaxed whitespace-pre-wrap font-medium">
                      {item.summary}
                    </p>
                  </div>
                )}

                {/* Detailed Competitor Points */}
                {item.detail && item.detail.length > 0 && (
                  <div className="bg-white border border-[#E5DFD1] rounded-2xl p-5 shadow-2xs">
                    <h4 className="text-xs font-bold text-[#708477] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#708477]" /> ข้อมูลจุดแข็ง & รายละเอียดคู่แข่ง
                    </h4>
                    <ul className="space-y-2">
                      {item.detail.map((d, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-[#4F6858]">
                          <span className="text-[#C59B3F] mt-0.5 shrink-0 font-bold">•</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Baan Home Advantages & Sales Pitch */}
              <div className="space-y-4">
                {/* Recommended Counter-Pitch / Sweet Spot */}
                <div className="bg-[#F4F9F5] border border-[#CDE3D5] rounded-2xl p-5 shadow-2xs">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-[#2D5A43] text-white">
                      <Sparkles className="w-4 h-4 text-[#E8C57D]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#1B3D2F] uppercase tracking-wider">
                        จุดแข็งบ้านโฮมที่ต้องชูโรง (จุดขายแก้เกม)
                      </h4>
                      <p className="text-[11px] text-[#526B5C]">สิ่งที่บ้านโฮมเหนือกว่าคู่แข่งรายนี้ เพื่อดึงลูกค้ามาหาเรา</p>
                    </div>
                  </div>
                  
                  <div className="bg-white/95 backdrop-blur-xs p-4 rounded-xl border border-[#D5E7DC] space-y-2.5 text-xs text-[#1F3327]">
                    <p className="font-bold text-[#1B3D2F]">
                      🌿 จุดขายสำคัญของบ้านโฮม (พนักงานนำเสนอให้ลูกค้าฟัง):
                    </p>
                    <ul className="space-y-2 pl-1 text-[#2D5A43]">
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-[#2D5A43] shrink-0 mt-0.5">✓</span>
                        <span><strong>สวนอาหารรสเด็ด & อาหารจัดเต็ม:</strong> ครัวอาหารขนาดใหญ่ รองรับงานเลี้ยง เมนู Signature ลาบปลาตะเพียนขึ้นชื่อ</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-[#2D5A43] shrink-0 mt-0.5">✓</span>
                        <span><strong>คิดราคาตามชั่วโมงจริง:</strong> เริ่มต้น 200–400 บาท/ชม. ยืดหยุ่น คล่องตัว ไม่บังคับเหมาวันเต็มราคาเหมือนโรงแรมใหญ่</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-[#2D5A43] shrink-0 mt-0.5">✓</span>
                        <span><strong>พูลวิลล่า & บรรยากาศผ่อนคลาย:</strong> พักผ่อนและว่ายน้ำส่วนตัวได้ในที่เดียว (Meeting & Stay) อบอุ่นเป็นกันเอง</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Sales Guardrails / Next Actions */}
                {item.nextActions && item.nextActions.length > 0 && (
                  <div className="bg-[#FAF8F5] border border-[#EBE3D5] rounded-2xl p-5 shadow-2xs">
                    <h4 className="text-xs font-bold text-[#7D5C26] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-[#916B2D]" /> แนวทางแนะนำสำหรับพนักงาน (Sales Guardrails)
                    </h4>
                    <ul className="space-y-2">
                      {item.nextActions.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs font-semibold text-[#573E18]">
                          <span className="text-[#916B2D] mt-0.5 shrink-0">👉</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 mt-2">
            
            {/* Customer Message Area */}
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-[#708477] uppercase tracking-wider">ข้อความสำหรับส่งลูกค้า</h4>
                {customerReady ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-[#EEF5EC] text-[#2D5A43] rounded-md">
                    พร้อมส่งลูกค้าทันที
                  </span>
                ) : item.customerMessage ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-[#FFF4E5] text-[#916B2D] rounded-md">
                    ร่างข้อความ (ตรวจทานก่อนส่ง)
                  </span>
                ) : null}
              </div>

              <div className={`flex-1 rounded-2xl p-5 border flex flex-col justify-between ${
                customerReady 
                  ? 'bg-[#F9FCF8] border-[#C6E8C3]' 
                  : item.customerMessage 
                    ? 'bg-[#FFFDF9] border-[#F0E5D3]' 
                    : 'bg-[#F9FAFB] border-[#E5E7EB]'
              }`}>
                {item.customerMessage ? (
                  <>
                    <p className="whitespace-pre-wrap text-[#2A4032] text-sm leading-relaxed font-medium">
                      {item.customerMessage}
                    </p>
                    <div className="mt-5 pt-4 border-t border-[#E5EFE2] flex flex-wrap items-center justify-between gap-2">
                      {primaryImage && (
                        <button
                          type="button"
                          onClick={(e) => handleCopyImageUrl(primaryImage, e)}
                          className="text-xs text-[#526B5C] hover:text-[#1B3D2F] flex items-center gap-1 font-medium transition-colors cursor-pointer"
                        >
                          {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedImage ? 'คัดลอกลิงก์รูปแล้ว!' : 'คัดลอกรูปส่งลูกค้า'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-[#2D5A43] hover:bg-[#1B3D2F] active:scale-95 text-white rounded-xl font-semibold text-sm transition-all shadow-md cursor-pointer"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copied ? 'คัดลอกสำเร็จ!' : 'คัดลอกส่งลูกค้า'}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto">
                    <AlertTriangle className="w-8 h-8 text-[#916B2D] opacity-40 mb-2" />
                    <p className="text-sm font-semibold text-[#1B3D2F]">ยังไม่มีข้อความพร้อมส่งลูกค้าโดยตรง</p>
                    <p className="text-xs text-[#708477] mt-1 max-w-xs">
                      ข้อมูลชุดนี้เป็นข้อมูลขั้นตอนภายในพนักงาน สามารถคัดลอกสรุปคำตอบพนักงานด้านขวาได้
                    </p>
                    {item.summary && (
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-[#916B2D] hover:bg-[#7D5C26] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>คัดลอกสรุปข้อมูลนี้</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Internal Information Area */}
            <details className="space-y-4 rounded-2xl border border-[#e3dacb] p-4">
              <summary className="text-sm font-semibold text-[#2D5A43] cursor-pointer">ดูแหล่งอ้างอิงและข้อมูลเพิ่มเติม · ข้อมูลภายใน</summary>
              {/* Staff Answer */}
              {item.summary && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-[#708477] uppercase tracking-wider">คำตอบสำหรับพนักงาน (Staff Only)</h4>
                    <button
                      type="button"
                      onClick={handleCopySummary}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#F8F6F0] text-[#7D5C26] border border-[#E5DFD1] rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                      title="คัดลอกสรุปสำหรับพนักงาน"
                    >
                      {copiedSummary ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSummary ? 'คัดลอกแล้ว' : 'คัดลอกสรุป'}</span>
                    </button>
                  </div>
                  <div className="bg-[#FFFDF9] border border-[#F0E5D3] rounded-xl p-4">
                    <p className="text-sm text-[#7D5C26] whitespace-pre-wrap">{item.summary}</p>
                  </div>
                </div>
              )}

              {/* Details & Conditions */}
              {item.detail && item.detail.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[#708477] uppercase tracking-wider mb-2">รายละเอียด / เงื่อนไข</h4>
                  <ul className="bg-white border border-[#E5DFD1] rounded-xl p-4 space-y-2">
                    {item.detail.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[#4F6858]">
                        <span className="text-[#916B2D] mt-0.5">•</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Actions */}
              {item.nextActions && item.nextActions.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[#708477] uppercase tracking-wider mb-2">สิ่งที่พนักงานต้องทำต่อ</h4>
                  <div className="bg-[#EEF5EC] border border-[#D5DFD8] rounded-xl p-4">
                    <ul className="space-y-2">
                      {item.nextActions.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm font-semibold text-[#1B3D2F]">
                          <CheckCircle2 className="w-4 h-4 text-[#2D5A43] mt-0.5" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

            </details>
          </div>
        )}

        {/* Visual Photo Section (If item has images or curated sample) */}
        {primaryImage && (
          <div className="mt-4 mb-6 max-w-sm rounded-2xl overflow-hidden border border-[#E2ECE5] bg-[#F7FAF8] shadow-2xs">
            <div className="relative h-36 sm:h-44 max-w-sm w-full overflow-hidden group cursor-pointer" onClick={() => setShowLightbox(true)} role="button" tabIndex={0} aria-label="ดูรูปขนาดใหญ่" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowLightbox(true); } }}>
              <img
                src={primaryImage}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-80 group-hover:opacity-90 transition-opacity" />

              {/* Badges on image */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="px-2.5 py-1 bg-black/60 backdrop-blur-xs text-white text-xs font-semibold rounded-lg flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#E2F0E0]" />
                  <span>รูปภาพสถานที่ / บริการ ({images.length} รูป)</span>
                </span>
              </div>

              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleCopyImageUrl(primaryImage, e)}
                  className="px-2.5 py-1 bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
                  title="คัดลอกลิงก์รูปภาพเพื่อส่งให้ลูกค้า"
                >
                  {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedImage ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์รูป'}</span>
                </button>
                <div 
                  className="p-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white rounded-lg transition-colors"
                  title="คลิกเพื่อดูรูปขนาดใหญ่"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Bottom bar on image */}
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-white text-xs">
                <span className="font-medium text-white/90 drop-shadow-xs line-clamp-1">
                  คลิกเพื่อดูรูปขนาดเต็ม หรือใช้ปุ่ม "แก้ไขรูปภาพ" เพื่ออัปเดตรูปจากหน้างาน
                </span>
                <span className="bg-white/20 px-2 py-0.5 rounded backdrop-blur-xs text-[11px] shrink-0 font-medium">
                  {activeImageIndex + 1} / {images.length}
                </span>
              </div>
            </div>

            {/* Thumbnails strip (if more than 1 image) */}
            {images.length > 1 && (
              <div className="p-2.5 bg-[#FAFDFB] border-t border-[#E2ECE5] flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] font-semibold text-[#526B5C] px-1 shrink-0">
                  รูปทั้งหมด:
                </span>
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex(idx);
                    }}
                    className={`relative w-14 h-10 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                      idx === activeImageIndex 
                        ? 'border-[#2D5A43] shadow-xs scale-105' 
                        : 'border-[#DFE7E1] opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="w-14 h-10 rounded-lg border border-dashed border-[#2D5A43]/50 hover:border-[#2D5A43] bg-[#EEF5EC]/50 hover:bg-[#EEF5EC] text-[#2D5A43] flex items-center justify-center shrink-0 transition-colors"
                  title="เพิ่มรูปภาพ"
                >
                  <ImagePlus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer Meta */}
        <details className="mt-4 text-xs text-[#637b6b]"><summary className="cursor-pointer py-2">ข้อมูลแหล่งอ้างอิงและวันที่อัปเดต</summary>
        <div className="mt-2 pt-4 border-t border-[#F0F2F1] flex flex-wrap items-center justify-between gap-4 text-[11px] text-[#8C9E90] font-medium">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5" title="แหล่งอ้างอิง">
              <FileText className="w-3.5 h-3.5" /> {item.sourceDoc || 'Google Sheet'}
            </span>
            <span className="flex items-center gap-1.5" title="แก้ไขล่าสุด">
              <Calendar className="w-3.5 h-3.5" /> อัปเดต: {item.lastUpdated}
            </span>
            {(item.startDate || item.endDate) && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#F9FAFB] rounded-md border border-[#E5E7EB]">
                ระยะเวลา: {item.startDate || '-'} ถึง {item.endDate || '-'}
              </span>
            )}
          </div>
          
          {/* Debug labels */}
          <div className="flex gap-2 opacity-50">
            <span>Status: {item.status}</span>
            <span>Data: {item.dataStatus}</span>
            <span>AI: {item.aiUsable}</span>
            <span>Audience: {item.audience}</span>
          </div>
        </div>
        </details>
      </div>

      {/* Lightbox Modal */}
      <ImageLightboxModal
        isOpen={showLightbox}
        images={images}
        initialIndex={activeImageIndex}
        title={item.title}
        onClose={() => setShowLightbox(false)}
      />

      {/* Edit Image Modal */}
      {showEditModal && <EditImageModal
        item={item}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSaved={(newImages) => {
          setImages(newImages);
          setActiveImageIndex(0);
        }}
      />}
    </div>
  );
};


