import React from 'react';
import { X, FileText, CheckCircle, ExternalLink, Calendar, BookOpen, Layers, ShieldCheck } from 'lucide-react';
import { CategoryMeta } from '../types';
import { KNOWLEDGE_BASE_ITEMS } from '../data/knowledgeBase';

interface DocPreviewModalProps {
  category: CategoryMeta | null;
  onClose: () => void;
  onSelectQuestion: (query: string) => void;
}

export const DocPreviewModal: React.FC<DocPreviewModalProps> = ({
  category,
  onClose,
  onSelectQuestion,
}) => {
  if (!category) return null;

  const relevantItems = KNOWLEDGE_BASE_ITEMS.filter((item) => item.category === category.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#FAF8F3] w-full max-w-2xl rounded-2xl shadow-2xl border border-[#D5DDD2] overflow-hidden flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="bg-[#1E3D2F] text-white p-4 sm:p-5 flex items-center justify-between border-b border-[#2C5542]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-[#E2BE76]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">
                  {category.nameTh}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/15 text-[#D1E5D8] font-mono">
                  {category.nameEn}
                </span>
              </div>
              <p className="text-xs text-[#BED2C4] font-mono mt-0.5">
                Google Doc: {category.googleDocName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#243B2E]">
          <div className="p-3.5 bg-[#EEF5EC] rounded-xl border border-[#CDE1C8]">
            <div className="font-semibold text-[#1B3F2E] flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-4 h-4 text-[#2D5A43]" />
              <span>โครงสร้างการ Sync จาก Google Docs:</span>
            </div>
            <p className="text-xs text-[#405C49] leading-relaxed">
              {category.description}
            </p>
            <div className="mt-2 text-[11px] text-[#55735E] flex items-center gap-2">
              <span>สถานะเชื่อมต่อ: <strong className="text-[#238636]">Online & Ready</strong></span>
              <span>&middot;</span>
              <span>จำนวนเอกสารย่อย: <strong>{category.docCount} ฉบับ</strong></span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-[#1C3326] mb-2.5 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#2D5A43]" />
              <span>หัวข้อที่บันทึกในเอกสารนี้ ({relevantItems.length} หัวข้อตัวอย่าง):</span>
            </h4>

            {relevantItems.length === 0 ? (
              <p className="text-xs text-[#7A8E81] italic p-4 bg-white rounded-xl border border-[#E3EBE0]">
                เอกสารนี้ได้รับการจัดเตรียมโครงสร้างโฟลเดอร์ใน Google Drive เรียบร้อยแล้ว กำลังรอทยอยเพิ่มเนื้อหาโดยทีมงานฝ่ายที่เกี่ยวข้อง
              </p>
            ) : (
              <div className="space-y-2.5">
                {relevantItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-white border border-[#E1E9DF] hover:border-[#2D5A43]/50 transition-colors shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-xs sm:text-sm text-[#1B3527]">
                        {item.title}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#EEF5EC] text-[#245B3B] font-mono shrink-0">
                        {item.lastUpdated}
                      </span>
                    </div>

                    <p className="text-xs text-[#4E6254] mt-1.5 line-clamp-2">
                      {item.summary}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-[#EDE6D7] flex items-center justify-between">
                      <span className="text-[11px] text-[#7A8E81]">
                        ส่วน: {item.docSection || 'บทความมาตรฐาน'}
                      </span>
                      <button
                        onClick={() => {
                          onSelectQuestion(item.keywords[0] || item.title);
                          onClose();
                        }}
                        className="text-xs text-[#2D5A43] font-bold hover:underline cursor-pointer"
                      >
                        ลองถามหัวข้อนี้ →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#F2EFE8] border-t border-[#E3DDD0] flex items-center justify-between">
          <div className="text-[11px] text-[#6E8073]">
            เชื่อมต่อผ่าน Google Workspace API (OAuth 2.0 / Service Account) ในขั้นตอนถัดไป
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2D5A43] text-white text-xs font-semibold rounded-lg hover:bg-[#1E3D2F] transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
