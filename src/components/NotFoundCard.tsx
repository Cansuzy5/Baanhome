import React, { useState } from 'react';
import { HelpCircle, AlertCircle, BookmarkPlus, Check, ArrowRight, BookOpen, Send } from 'lucide-react';
import { KnowledgeCategory } from '../types';
import { KNOWLEDGE_CATEGORIES } from '../data/categories';

interface NotFoundCardProps {
  questionText: string;
  staffName: string;
  department: string;
  onViewUnansweredList: () => void;
  onAskPredefined: (q: string) => void;
  suggestedCategory?: KnowledgeCategory;
  onAddCustomNote?: (note: string) => void;
}

export const NotFoundCard: React.FC<NotFoundCardProps> = ({
  questionText,
  staffName,
  department,
  onViewUnansweredList,
  onAskPredefined,
  suggestedCategory,
  onAddCustomNote,
}) => {
  const [extraNote, setExtraNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  const handleSaveNote = () => {
    if (extraNote.trim() && onAddCustomNote) {
      onAddCustomNote(extraNote);
      setNoteSaved(true);
    }
  };

  return (
    <div className="bg-[#FCFBF7] rounded-2xl border-2 border-[#E7D6BE] shadow-lg overflow-hidden transition-all">
      {/* Warning Header */}
      <div className="bg-gradient-to-r from-[#946123] to-[#B07219] text-white p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="p-1 rounded-md bg-white/20">
            <AlertCircle className="w-5 h-5 text-[#FFF2D6]" />
          </div>
          <span className="text-xs font-semibold tracking-wider uppercase text-[#FFF2D6]">
            Strict Knowledge Verification &middot; ไม่เดาคำตอบ
          </span>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-white">
          ยังไม่พบข้อมูลในฐานความรู้
        </h3>
        <p className="text-xs sm:text-sm text-[#FCEBD0] mt-1">
          น้องโฮมถูกออกแบบให้ตอบเฉพาะข้อมูลที่ได้รับการรับรองใน Google Docs เท่านั้น เพื่อป้องกันการให้ข้อมูลผิดพลาดแก่ลูกค้า
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Question Details Recorded */}
        <div className="bg-[#FAF5EC] border border-[#EBD6B8] rounded-xl p-4">
          <div className="text-xs font-bold text-[#805014] uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>คำถามที่ส่งเข้ามา:</span>
            <span className="text-[11px] font-normal text-[#9B6A2A]">
              บันทึกเวลา: {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
            </span>
          </div>
          <p className="text-base font-semibold text-[#3D2910]">
            "{questionText}"
          </p>
          <div className="mt-2 text-xs text-[#7A5B31] flex flex-wrap items-center gap-2">
            <span>ผู้ถาม: <strong>{staffName}</strong></span>
            <span>&middot;</span>
            <span>แผนก: <strong>{department}</strong></span>
          </div>
        </div>

        {/* System Action: Logged to Unanswered Queue */}
        <div className="flex items-start gap-3 p-3.5 bg-[#EEF5EC] border border-[#CDE3C8] rounded-xl text-[#214D32]">
          <div className="p-1.5 rounded-lg bg-[#2D5A43] text-white shrink-0 mt-0.5">
            <BookmarkPlus className="w-4 h-4" />
          </div>
          <div className="text-xs sm:text-sm">
            <span className="font-bold block text-[#1B3F28]">
              บันทึกคำถามนี้ไว้ในรายการ "Unanswered Questions" อัตโนมัติแล้ว
            </span>
            <p className="text-[#3E5C46] mt-0.5">
              ระบบส่งคำถามนี้ไปยัง Google Sheets เพื่อให้ทีมผู้จัดการและเจ้าของเอกสาร (Doc Owner) อัปเดตข้อมูลลง Google Docs หมวดที่เกี่ยวข้องต่อไป
            </p>
          </div>
        </div>

        {/* Optional Add Context for Admins */}
        <div className="bg-white rounded-xl border border-[#EBE4D5] p-4">
          <label className="block text-xs font-semibold text-[#4A3D2C] mb-1">
            ต้องการฝากโน้ตเพิ่มเติมสำหรับผู้ดูแลเอกสารหรือไม่ (ถ้ามี):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={extraNote}
              onChange={(e) => setExtraNote(e.target.value)}
              disabled={noteSaved}
              placeholder="เช่น ลูกค้าถามกรณีห้องเบอร์ 5 ต้องการทราบด่วนภายในวันนี้..."
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-[#DACDC0] focus:outline-none focus:ring-2 focus:ring-[#B07219] bg-[#FAF9F5]"
            />
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={noteSaved || !extraNote.trim()}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                noteSaved
                  ? 'bg-[#238636] text-white'
                  : 'bg-[#946123] hover:bg-[#7D4F19] text-white'
              }`}
            >
              {noteSaved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>บันทึกแล้ว</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>แนบโน้ต</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Suggested Helpful Actions */}
        <div className="pt-2 border-t border-[#EDE4D2] flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onViewUnansweredList}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#805014] hover:text-[#5E390A] hover:underline cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>ดูรายการคำถามรออัปเดตทั้งหมด (Unanswered List)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#7A6E5E]">หรือลองถามหัวข้อยอดนิยม:</span>
            <button
              onClick={() => onAskPredefined('เวลา Check-in และ Check-out กี่โมง')}
              className="text-xs px-2.5 py-1 rounded-md bg-[#FAF2E3] hover:bg-[#F3E5CA] text-[#7A4E15] font-medium border border-[#E5D2B1] transition-colors cursor-pointer"
            >
              เวลาเช็คอิน
            </button>
            <button
              onClick={() => onAskPredefined('พูลวิลล่าใช้เสียงได้ถึงกี่โมง')}
              className="text-xs px-2.5 py-1 rounded-md bg-[#FAF2E3] hover:bg-[#F3E5CA] text-[#7A4E15] font-medium border border-[#E5D2B1] transition-colors cursor-pointer"
            >
              พูลวิลล่า
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
