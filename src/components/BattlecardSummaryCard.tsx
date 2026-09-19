import React, { useState } from 'react';
import {
  ShieldAlert,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ThumbsUp,
  XCircle,
  TrendingUp,
  Target,
  Users,
  Building,
  DollarSign,
  Coffee,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { KnowledgeItem, FeedbackType } from '../types';

interface BattlecardSummaryCardProps {
  item: KnowledgeItem;
  questionText: string;
  onFeedback: (type: FeedbackType, note?: string) => void;
  currentFeedback?: FeedbackType;
  onOpenDocPreview?: (docName: string) => void;
}

export const BattlecardSummaryCard: React.FC<BattlecardSummaryCardProps> = ({
  item,
  questionText,
  onFeedback,
  currentFeedback,
  onOpenDocPreview,
}) => {
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<FeedbackType | null>(
    currentFeedback || null
  );

  const cData = item.competitorData;

  const handleCopyPitch = async () => {
    const textToCopy = cData?.salesPitch || item.customerMessage;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedPitch(true);
      setTimeout(() => setCopiedPitch(false), 2200);
    } catch {
      setCopiedPitch(true);
      setTimeout(() => setCopiedPitch(false), 2200);
    }
  };

  const handleCopyCustomerMessage = async () => {
    try {
      await navigator.clipboard.writeText(item.customerMessage);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2200);
    } catch {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2200);
    }
  };

  const handleSelectFeedback = (type: FeedbackType) => {
    setFeedbackSubmitted(type);
    if (type !== 'accurate') {
      setShowNoteInput(true);
    } else {
      setShowNoteInput(false);
      onFeedback('accurate');
    }
  };

  const handleSaveNote = () => {
    if (feedbackSubmitted) {
      onFeedback(feedbackSubmitted, feedbackNote);
      setShowNoteInput(false);
    }
  };

  return (
    <div className="bg-[#FAF8F3] rounded-3xl p-4 sm:p-7 border border-[#D5DFD1] shadow-sm mb-8 transition-all">
      {/* 1. Header Bar with Confidential Warning & Sweet Spot Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#E2EBDD]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#173826] text-[#E8C57D] flex items-center justify-center shrink-0 shadow-xs">
            <Target className="w-5 h-5 text-[#E8C57D]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base sm:text-lg font-bold text-[#143322] font-heading tracking-tight">
                📊 สรุปเปรียบเทียบ & Sales Battlecard
              </span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#1B3E2D] text-[#E8C57D]">
                {item.id}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFEED4] text-[#9A5A12] border border-[#F5D8AA] flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-[#B4660B]" />
                <span>ข้อมูลสำหรับพนักงานภายใน (Internal Only)</span>
              </span>
            </div>
            <p className="text-xs text-[#526B5C] mt-0.5">
              สรุปภาพรวมเปรียบเทียบ จุดแข็ง Sweet Spot ของเรา และสคริปต์การขายตอบลูกค้า
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF5EB] border border-[#D3E3CF] text-xs font-semibold text-[#255C3A]">
          <span>🎯 Sweet Spot: ทีม 5–50 คน</span>
        </div>
      </div>

      {/* 2. User Question Banner */}
      <div className="mb-5 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#D8E4D5] shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#205234]" />
          <span className="text-xs sm:text-sm text-[#1B3827]">
            ประเด็นคำถาม: <strong className="text-[#0E271A]">“{questionText || item.title}”</strong>
          </span>
        </div>
        <span className="text-[11px] text-[#698273] font-medium hidden sm:inline">
          ระบบสรุปสาระสำคัญอัตโนมัติ
        </span>
      </div>

      {/* 3. EXECUTIVE COMPARISON MATRIX (สรุปหมัดต่อหมัด) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* Left: 🎯 Sweet Spot & จุดเด่นของบ้านโฮม */}
        <div className="bg-gradient-to-br from-[#F5F9F4] to-[#FFFFFF] rounded-2xl p-4 sm:p-5 border-2 border-[#BCD7B8] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E3EDE0] mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#205235] text-white flex items-center justify-center text-xs">
                  🌿
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#143623]">
                    บ้านโฮม Mini MICE (Sweet Spot ของเรา)
                  </h4>
                  <span className="text-[10px] text-[#557561]">จุดยืนและความได้เปรียบที่เราโดดเด่น</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E5F3E2] text-[#1B6334] border border-[#C5E5C0]">
                เน้นขายกลุ่มนี้ 🌟
              </span>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              {/* Sweet spot capacity */}
              <div className="bg-white p-3 rounded-xl border border-[#E3EDE0] shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-[#235738] mb-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>ขนาดกลุ่มที่เหมาะสมที่สุด (Capacity):</span>
                </div>
                <p className="text-[#1E3929] leading-relaxed">
                  {cData?.capacityComp || 'ทีมขนาด 5–50 คน (VIP เล็ก ≤15 ท่าน / VIP ใหญ่ ≤50 ท่าน)'}
                </p>
                <span className="text-[11px] text-[#63806F] mt-0.5 block">
                  👉 ไม่เคอะเขินในห้องกว้างเกินไป อบอุ่น เป็นส่วนตัว
                </span>
              </div>

              {/* Pricing model */}
              <div className="bg-white p-3 rounded-xl border border-[#E3EDE0] shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-[#235738] mb-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>ความคุ้มค่าและความยืดหยุ่น (Pricing):</span>
                </div>
                <p className="text-[#1E3929] leading-relaxed">
                  {cData?.pricingComp || 'คิดเป็นรายชั่วโมงได้ (200 / 400 บาท/ชม.) หรือเหมาวันพร้อมส่วนลดค่าอาหาร'}
                </p>
                <span className="text-[11px] text-[#63806F] mt-0.5 block">
                  👉 ประชุมกี่ชั่วโมงก็จ่ายตามจริง คุมงบได้ง่าย ไม่ต้องเหมาเต็มวัน
                </span>
              </div>

              {/* Atmosphere & Food */}
              <div className="bg-white p-3 rounded-xl border border-[#E3EDE0] shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-[#235738] mb-1">
                  <Coffee className="w-3.5 h-3.5" />
                  <span>อาหาร & บรรยากาศ (One Destination):</span>
                </div>
                <p className="text-[#1E3929] leading-relaxed">
                  สวนอาหารรสเด็ด (ลาบปลาตะเพียน) + พูลวิลล่าส่วนตัว + ธรรมชาติร่มรื่น + EV Charger
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E3EDE0] text-[11px] text-[#4F6D5B] flex items-center justify-between">
            <span>ทำเล: อ.ยางตลาด เชื่อมต่อสะดวก</span>
            <span className="font-bold text-[#1E5632]">คุ้มค่า & คล่องตัวสูงสุด</span>
          </div>
        </div>

        {/* Right: 🏢 คู่แข่ง / บริบทที่ลูกค้าเปรียบเทียบ */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE4DA] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#EEF2EC] mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#536B5E] text-white flex items-center justify-center text-xs">
                  🏢
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#203629]">
                    {cData?.competitorName || 'คู่แข่ง / ตัวเลือกอื่นที่ลูกค้าพิจารณา'}
                  </h4>
                  <span className="text-[10px] text-[#718578]">
                    {cData?.competitorType || 'กลุ่มโรงแรมขนาดใหญ่ / สถานที่อื่น'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F3F4F2] text-[#55695D]">
                Scale & Context
              </span>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              {/* Scale */}
              <div className="bg-[#FAFBF9] p-3 rounded-xl border border-[#E9EFE7]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#486353] mb-1">
                  <Building className="w-3.5 h-3.5" />
                  <span>สเกลงานที่คู่แข่งถนัด:</span>
                </div>
                <p className="text-[#2C3E33]">
                  งานขนาดใหญ่ 50–1,000 คน, ห้องบอลรูม, งานพิธีการระดับจังหวัด
                </p>
                <span className="text-[11px] text-[#798E80] mt-0.5 block">
                  👉 ถ้าเป็นทีม 10–30 คน ห้องจะใหญ่เกินไปและรู้สึกโหวงเหวง
                </span>
              </div>

              {/* Pricing condition */}
              <div className="bg-[#FAFBF9] p-3 rounded-xl border border-[#E9EFE7]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#486353] mb-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>เงื่อนไขราคาของโรงแรมทั่วไป:</span>
                </div>
                <p className="text-[#2C3E33]">
                  มักคิดเป็นแพ็กเกจเหมาเต็มวัน/ครึ่งวัน ไม่มีอัตรารายชั่วโมงย่อย
                </p>
              </div>

              {/* Status or Mystery shopping note */}
              {cData?.mysteryShoppingStatus && (
                <div className="bg-[#FFF9EC] p-3 rounded-xl border border-[#F5E2B8] text-[#8E5E14]">
                  <div className="flex items-center gap-1.5 text-xs font-bold mb-0.5">
                    <span>🔍 ข้อมูลราคาล่าสุด (Mystery Shopping):</span>
                  </div>
                  <p className="text-xs leading-relaxed">{cData.mysteryShoppingStatus}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EEF2EC] text-[11px] text-[#728578] flex items-center justify-between">
            <span>บทวิเคราะห์เพื่อวางกลยุทธ์การขาย</span>
            <span className="font-semibold text-[#405C4C]">ไม่โจมตีคู่แข่ง</span>
          </div>
        </div>
      </div>

      {/* 4. 💬 SALES PITCH & สคริปต์พูดแนะนำ (Word-for-Word Pitch) */}
      <div className="bg-white rounded-2xl border-2 border-[#C8DFCA] p-4 sm:p-6 mb-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-[#F0F5EE]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EAF5E8] text-[#245D3B] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[#1E6738]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-[#143622]">
                  💬 สคริปต์การขายที่พนักงานใช้ตอบลูกค้า (Sales Pitch)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF5E8] text-[#216137]">
                  สุภาพ เป็นมืออาชีพ ชูจุดแข็งเรา
                </span>
              </div>
              <p className="text-xs text-[#597463]">
                ใช้ตอบได้ทั้งทางแชท LINE OA / หน้าเพจ หรือพูดอธิบายทางโทรศัพท์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPitch}
              className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs ${
                copiedPitch
                  ? 'bg-[#238636] text-white ring-2 ring-[#238636]/30'
                  : 'bg-[#183D29] hover:bg-[#102B1D] text-white active:scale-98'
              }`}
            >
              {copiedPitch ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>คัดลอกสคริปต์แล้ว ✨</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#E6C687]" />
                  <span>📋 คัดลอกสคริปต์พูด</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pitch content box */}
        <div className="bg-[#FAF9F5] rounded-xl p-4 sm:p-5 border border-[#E9E1D1] shadow-inner text-[#173322] text-sm sm:text-base leading-relaxed select-all">
          <p className="font-sans font-medium leading-relaxed">
            “{cData?.salesPitch || item.customerMessage}”
          </p>
        </div>

        {/* Alternative customer message if different */}
        {cData?.salesPitch && item.customerMessage && (
          <div className="mt-3 pt-3 border-t border-[#F2ECE0] flex items-center justify-between text-xs text-[#637C6D]">
            <span>หรือส่งข้อความฉบับเต็ม:</span>
            <button
              type="button"
              onClick={handleCopyCustomerMessage}
              className="text-[#1E5D34] font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              {copiedMessage ? <span>คัดลอกฉบับเต็มแล้ว</span> : <span>คัดลอกข้อความยาวส่งแชท</span>}
            </button>
          </div>
        )}
      </div>

      {/* 5. ⚠️ GUARDRAILS & กฎเหล็กของทีม (สิ่งที่ห้ามพูด/ข้อควรระวัง) */}
      <div className="bg-[#FFFDF7] rounded-2xl border border-[#F2DFB8] p-4 sm:p-5 mb-5 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold text-[#8C580E] uppercase tracking-wider mb-2.5 pb-2 border-b border-[#F7EACD]">
          <AlertTriangle className="w-4 h-4 text-[#B56707]" />
          <span>⚠️ กฎเหล็ก & ข้อพึงระวังของพนักงาน (Guardrails)</span>
        </div>

        <div className="space-y-2 text-xs sm:text-sm text-[#5B3D0B]">
          {cData?.guardrails && cData.guardrails.length > 0 ? (
            cData.guardrails.map((g, idx) => (
              <div key={idx} className="flex items-start gap-2.5 bg-white p-2.5 rounded-xl border border-[#F5E5C4]">
                <span className="text-[#B56707] font-bold text-xs shrink-0 mt-0.5">✕</span>
                <span className="leading-relaxed font-medium">{g}</span>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-start gap-2.5 bg-white p-2.5 rounded-xl border border-[#F5E5C4]">
                <span className="text-[#B56707] font-bold text-xs shrink-0 mt-0.5">✕</span>
                <span className="leading-relaxed font-medium">
                  ห้ามพูดโจมตีหรือกล่าวว่าคู่แข่งในทางลบเด็ดขาด ให้เน้นจุดเด่นเรื่องความคล่องตัวของบ้านโฮม
                </span>
              </div>
              <div className="flex items-start gap-2.5 bg-white p-2.5 rounded-xl border border-[#F5E5C4]">
                <span className="text-[#B56707] font-bold text-xs shrink-0 mt-0.5">✕</span>
                <span className="leading-relaxed font-medium">
                  ห้ามรับงานที่จำนวนคนเกิน 50 คนในห้อง VIP หากลูกค้ามีคณะเกิน 50 คน ให้แนะนำโรงแรมใหญ่ตามตรง
                </span>
              </div>
            </>
          )}
          <div className="flex items-start gap-2.5 bg-white p-2.5 rounded-xl border border-[#F5E5C4]">
            <span className="text-[#1A6133] font-bold text-xs shrink-0 mt-0.5">✓</span>
            <span className="leading-relaxed font-medium text-[#1E5230]">
              ตรวจสอบตารางห้องว่างในระบบกลาง และอ้างอิง Rate Card ที่ผู้จัดการรับรองเสมอ
            </span>
          </div>
        </div>
      </div>

      {/* 6. Footer Feedback & Reference */}
      <div className="pt-4 border-t border-[#DDE7DA] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap text-[#466352]">
          <FileText className="w-4 h-4 text-[#26573A]" />
          <span>แหล่งอ้างอิง:</span>
          <span className="font-mono font-bold text-[#1D4A30] bg-white px-2 py-0.5 rounded border border-[#D5E2D2]">
            {item.sourceDoc} ({item.docSection})
          </span>
          {item.lastUpdated && (
            <span className="text-[#728B7C]">&middot; อัปเดต {item.lastUpdated}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[#3C5747]">ข้อมูลนี้เป็นประโยชน์ไหม:</span>
          <button
            type="button"
            onClick={() => handleSelectFeedback('accurate')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              feedbackSubmitted === 'accurate'
                ? 'bg-[#238636] text-white ring-2 ring-[#238636]/30'
                : 'bg-white hover:bg-[#EEF6EB] text-[#255237] border border-[#CCD8C8]'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>ตรงกับงานจริง</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectFeedback('incomplete')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              feedbackSubmitted === 'incomplete'
                ? 'bg-[#B07219] text-white ring-2 ring-[#B07219]/30'
                : 'bg-white hover:bg-[#FDF5E8] text-[#845210] border border-[#E8DCB9]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>ปรับปรุงสคริปต์</span>
          </button>
        </div>
      </div>

      {showNoteInput && (
        <div className="mt-3.5 p-3.5 bg-white rounded-2xl border border-[#D5E3D2] animate-in fade-in">
          <label className="block text-xs font-semibold text-[#274232] mb-1.5">
            ข้อเสนอแนะในการปรับสคริปต์การขาย หรือข้อโต้แย้งที่พบจากลูกค้าจริง:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              placeholder="เช่น ลูกค้ามักต่อรองราคาขอแถมเบรคฟรี..."
              className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-[#CCD8C8] focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
            />
            <button
              type="button"
              onClick={handleSaveNote}
              className="px-4 py-2 bg-[#2D5A43] hover:bg-[#1E3D2F] text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              บันทึก Feedback
            </button>
          </div>
        </div>
      )}

      {feedbackSubmitted && !showNoteInput && (
        <div className="mt-2.5 text-xs text-[#2A663F] flex items-center gap-1.5 font-medium">
          <Check className="w-3.5 h-3.5" />
          <span>บันทึกความเห็นเกี่ยวกับ Battlecard เรียบร้อยแล้ว ขอบคุณค่ะ ✨</span>
        </div>
      )}
    </div>
  );
};
