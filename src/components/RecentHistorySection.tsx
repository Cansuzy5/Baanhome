import React from 'react';
import { History, CheckCircle, XCircle, ArrowUpRight, Clock, User, Sheet, Trash2 } from 'lucide-react';
import { QuestionLog } from '../types';

interface RecentHistorySectionProps {
  logs: QuestionLog[];
  onSelectLog: (log: QuestionLog) => void;
  onViewAllSheets: () => void;
  onDeleteLog?: (id: string) => void;
}

export const RecentHistorySection: React.FC<RecentHistorySectionProps> = ({
  logs,
  onSelectLog,
  onViewAllSheets,
  onDeleteLog,
}) => {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-[#E5EFE2] text-[#24533A]">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#1F382A]">
              ประวัติคำถามล่าสุด (Recent Inquiries)
            </h3>
            <p className="text-xs text-[#6A7E71]">
              คำถามที่พนักงานถามเข้ามาในรอบวัน บันทึกจริงลงใน Google Sheets
            </p>
          </div>
        </div>

        <button
          onClick={onViewAllSheets}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#2D5A43] hover:text-[#183929] hover:underline cursor-pointer"
        >
          <Sheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>ดูตาราง Google Sheets ทั้งหมด</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="bg-[#FAF8F3] rounded-2xl border border-[#E3DDD0] divide-y divide-[#EDE7DB] overflow-hidden shadow-2xs">
        {logs.slice(0, 5).map((log) => (
          <div
            key={log.id}
            onClick={() => onSelectLog(log)}
            className="p-3.5 sm:p-4 hover:bg-[#F4EFE4] transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap text-xs text-[#6B7E72] mb-1">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-[#94A59A]" />
                  {log.timestamp}
                </span>
                <span>&middot;</span>
                <span className="flex items-center gap-1 font-medium text-[#2E4A3B]">
                  <User className="w-3 h-3 text-[#94A59A]" />
                  {log.staffName} ({log.department.split(' ')[0]})
                </span>
                <span className="hidden sm:inline">&middot;</span>
                <span className="px-2 py-0.5 rounded-md bg-[#EDE5D5] text-[#55695D] text-[11px] truncate max-w-[200px]">
                  {log.category}
                </span>
              </div>

              <div className="font-semibold text-sm sm:text-base text-[#1C3025] group-hover:text-[#24573D] transition-colors line-clamp-1">
                "{log.question}"
              </div>

              <div className="text-xs text-[#5D7063] mt-0.5 line-clamp-1">
                {log.found ? (
                  <span>ตอบ: {log.answerSummary}</span>
                ) : (
                  <span className="text-[#C27D23] font-medium">ยังไม่พบข้อมูล &middot; บันทึกในคิวรอคำตอบแล้ว</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
              {log.found ? (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[#E5EFE2] text-[#24583C] font-semibold border border-[#CDE1C8]">
                  <CheckCircle className="w-3.5 h-3.5 text-[#238636]" />
                  <span>พบคำตอบ</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[#FDF0DE] text-[#8C5810] font-semibold border border-[#F3DFC1]">
                  <XCircle className="w-3.5 h-3.5 text-[#B07219]" />
                  <span>รออัปเดต</span>
                </span>
              )}

              {log.feedback && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-white text-[#4D6354] border border-[#D5DDD2]">
                  {log.feedback === 'accurate' ? '👍 ถูกต้อง' : log.feedback === 'incomplete' ? '⚠️ ไม่ครบ' : '❌ ผิด'}
                </span>
              )}

              {onDeleteLog && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`ต้องการลบคำถาม "${log.question}" ออกจากประวัติใช่หรือไม่?`)) {
                      onDeleteLog(log.id);
                    }
                  }}
                  className="p-1 rounded-md text-[#9E2A2B]/70 hover:text-[#9E2A2B] hover:bg-red-50 transition-colors opacity-70 hover:opacity-100 cursor-pointer"
                  title="ลบรายการนี้"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <ArrowUpRight className="w-4 h-4 text-[#8BA092] group-hover:text-[#2D5A43] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
