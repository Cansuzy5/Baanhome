import React, { useState } from 'react';
import {
  HelpCircle,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  FileText,
  Plus,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { UnansweredQuestion, KnowledgeCategory } from '../types';
import { KNOWLEDGE_CATEGORIES } from '../data/categories';

interface UnansweredQuestionsViewProps {
  questions: UnansweredQuestion[];
  onUpdateStatus: (id: string, status: 'pending' | 'assigned' | 'resolved', notes?: string) => void;
  onAskQuestion: (q: string) => void;
  onDeleteQuestion?: (id: string) => void;
  onClearResolved?: () => void;
}

export const UnansweredQuestionsView: React.FC<UnansweredQuestionsViewProps> = ({
  questions,
  onUpdateStatus,
  onAskQuestion,
  onDeleteQuestion,
  onClearResolved,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const pendingCount = questions.filter((q) => q?.status === 'pending').length;
  const assignedCount = questions.filter((q) => q?.status === 'assigned').length;
  const resolvedCount = questions.filter((q) => q?.status === 'resolved').length;

  const handleStartEdit = (q: UnansweredQuestion) => {
    setEditingId(q.id);
    setNoteText(q.adminNotes || '');
  };

  const handleSaveNote = (id: string, currentStatus: 'pending' | 'assigned' | 'resolved') => {
    onUpdateStatus(id, currentStatus, noteText);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#7D4E19] to-[#9E6422] text-white p-5 rounded-2xl shadow-md">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white text-[#7D4E19] rounded-xl shadow-xs">
              <HelpCircle className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold">
                  เครื่องมือจัดการคำถาม (Unanswered Questions)
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">
                  Queue Manager
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                รายการคำถามที่พนักงานค้นหาแล้วไม่เจอ รอการอัปเดตคำตอบลง Google Docs
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {resolvedCount > 0 && onClearResolved && (
                <button
                  onClick={() => {
                    if (window.confirm(`ต้องการลบรายการที่อัปเดตลง Docs เสร็จสิ้นแล้วทั้งหมด ${resolvedCount} รายการใช่หรือไม่?`)) {
                      onClearResolved();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-red-500/80 rounded-xl text-white font-medium transition-colors text-xs cursor-pointer border border-white/20"
                  title="ลบคำถามที่อัปเดตลง Docs เสร็จแล้วออกทั้งหมด"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ล้างรายการที่เสร็จแล้ว ({resolvedCount})</span>
                </button>
              )}
              <button
                onClick={() => {
                  import('../utils/csvExport').then((module) => {
                    module.exportUnansweredToCSV(questions);
                  });
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-white font-semibold transition-colors text-sm cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>ดาวน์โหลด CSV (Excel)</span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-white/15 border border-white/25">
                รอตรวจสอบ: <strong>{pendingCount}</strong>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-white/15 border border-white/25">
                มอบหมายแล้ว: <strong>{assignedCount}</strong>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-white/15 border border-white/25">
                อัปเดตลง Docs แล้ว: <strong>{resolvedCount}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-3.5">
        {questions.length === 0 ? (
          <div className="bg-[#FAF8F3] rounded-2xl border border-[#E3DDD0] p-12 text-center text-[#708477]">
            <CheckCircle className="w-10 h-10 text-[#2D5A43] mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-base">ยอดเยี่ยม! ไม่มีคำถามค้างรออัปเดต</p>
            <p className="text-xs mt-1">ทุกคำถามที่พนักงานถามเข้ามา มีข้อมูลครบถ้วนในฐานความรู้ Google Docs</p>
          </div>
        ) : (
          questions.filter(Boolean).map((q) => {
            const cat = KNOWLEDGE_CATEGORIES.find((c) => c.id === q.suggestedCategory);
            return (
              <div
                key={q.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs transition-all ${
                  q.status === 'resolved'
                    ? 'border-[#C6E8C3] opacity-75 bg-[#F9FCF8]'
                    : q.status === 'assigned'
                    ? 'border-[#B8D4E3] bg-[#F4F9FB]'
                    : 'border-[#F0E5D3] hover:border-[#E8C57D]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Status Badge & Meta */}
                    <div className="flex items-center gap-3 mb-2">
                      {q.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded-md bg-[#FFF3CD] text-[#856404] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> รอดำเนินการ
                        </span>
                      )}
                      {q.status === 'assigned' && (
                        <span className="px-2 py-0.5 rounded-md bg-[#D1ECF1] text-[#0C5460] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <User className="w-3 h-3" /> มอบหมายแล้ว
                        </span>
                      )}
                      {q.status === 'resolved' && (
                        <span className="px-2 py-0.5 rounded-md bg-[#D4EDDA] text-[#155724] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> อัปเดตลง Docs แล้ว
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-[11px] text-[#8C9E90] font-medium">
                        <Clock className="w-3 h-3" />
                        {q.timestamp}
                      </span>
                    </div>

                    {/* Question */}
                    <h4 className="text-base font-bold text-[#1B3D2F] mb-1.5 leading-snug">
                      "{q.question}"
                    </h4>

                    {/* Asker Info */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#5D7063]">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-[#374B3E]">ผู้ถาม:</span>
                        {q.staffName}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-[#374B3E]">แผนก:</span>
                        {q.department}
                      </div>
                    </div>

                    {/* AI Suggestion */}
                    {(q.suggestedCategory || q.targetDoc) && (
                      <div className="mt-3 p-2.5 rounded-xl bg-[#F8F6F0] border border-[#E8E1D2] flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7D4E19]">
                          <Sparkles className="w-3.5 h-3.5" />
                          AI แนะนำให้อัปเดตที่:
                        </div>
                        <div className="flex items-center gap-1.5 flex-1 text-xs">
                          {cat && (
                            <span className="px-1.5 py-0.5 rounded bg-white border border-[#E5DFD1] text-[#4A5D4E] flex items-center gap-1">
                              {cat.icon} {cat.nameTh}
                            </span>
                          )}
                          {q.targetDoc && (
                            <a 
                              href="#" 
                              className="text-[#107C41] hover:underline flex items-center gap-1 font-medium truncate max-w-[200px]"
                              onClick={(e) => e.preventDefault()}
                            >
                              <ExternalLink className="w-3 h-3" />
                              {q.targetDoc}
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Admin Notes */}
                    <div className="mt-3">
                      {editingId === q.id ? (
                        <div className="flex items-start gap-2">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="ระบุชื่อผู้รับผิดชอบ หรือ โน้ตสถานะการทำงาน..."
                            className="flex-1 min-h-[60px] p-2 text-xs border border-[#CCD8CB] rounded-lg focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43] bg-white resize-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveNote(q.id, q.status)}
                            className="px-3 py-2 bg-[#2D5A43] text-white text-xs font-semibold rounded-lg hover:bg-[#1E3D2F]"
                          >
                            บันทึก
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-2 bg-[#F0ECE1] text-[#5D7063] text-xs font-semibold rounded-lg hover:bg-[#E5DFD1]"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <div 
                          className={`text-xs p-2.5 rounded-lg border border-dashed transition-colors ${
                            q.adminNotes 
                              ? 'bg-[#F2FBF5] border-[#A7D7B5] text-[#24633E]' 
                              : 'bg-transparent border-[#D1D5DB] text-[#9CA3AF] hover:bg-[#F9FAFB] hover:text-[#6B7280] cursor-pointer'
                          }`}
                          onClick={() => handleStartEdit(q)}
                        >
                          {q.adminNotes ? (
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <strong className="block mb-0.5">Admin Note:</strong>
                                <span>{q.adminNotes}</span>
                              </div>
                              <span className="text-[10px] underline opacity-70">แก้ไข</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <Plus className="w-3.5 h-3.5" />
                              <span>เพิ่ม Note หรือระบุผู้รับผิดชอบ</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 border-t sm:border-t-0 sm:border-l border-[#F0ECE1] pt-3 sm:pt-0 sm:pl-4 min-w-[140px]">
                    <div className="text-[10px] font-semibold text-[#8C9E90] uppercase tracking-wider hidden sm:block mb-1">
                      อัปเดตสถานะ
                    </div>
                    <div className="flex sm:flex-col gap-1.5 w-full">
                      {q.status === 'pending' && (
                        <button
                          onClick={() => onUpdateStatus(q.id, 'assigned', q.adminNotes)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-[#E2F0E0] hover:bg-[#CFE4CE] text-[#1B3E2D] font-semibold transition-colors cursor-pointer"
                        >
                          มอบหมายแล้ว
                        </button>
                      )}
                      
                      {q.status !== 'resolved' ? (
                        <button
                          onClick={() => onUpdateStatus(q.id, 'resolved', q.adminNotes)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-[#238636] hover:bg-[#1E742E] text-white font-semibold transition-colors cursor-pointer"
                          title="ทำเครื่องหมายว่าอัปเดตคำตอบลง Google Docs เรียบร้อยแล้ว"
                        >
                          เสร็จสิ้น (Resolved)
                        </button>
                      ) : (
                        <button
                          onClick={() => onUpdateStatus(q.id, 'pending', q.adminNotes)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-white border border-[#CCD8CB] text-[#617467] hover:bg-[#F0ECE3] cursor-pointer"
                        >
                          เปิดใหม่ (Reopen)
                        </button>
                      )}

                      <button
                        onClick={() => onAskQuestion(q.question)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-[#2D5A43] hover:bg-[#1E3D2F] text-white font-medium flex items-center gap-1 cursor-pointer justify-center"
                      >
                        <span>ทดสอบถาม</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      {/* Delete Button with Inline Confirmation */}
                      {confirmDeleteId === q.id ? (
                        <div className="flex items-center gap-1 w-full bg-[#FEF2F2] p-1 rounded-lg border border-[#FCA5A5] animate-fade-in">
                          <button
                            onClick={() => {
                              onDeleteQuestion?.(q.id);
                              setConfirmDeleteId(null);
                            }}
                            className="flex-1 text-[11px] py-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded-md transition-colors cursor-pointer"
                            title="ยืนยันการลบคำถามนี้"
                          >
                            ยืนยันลบ
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 text-[11px] py-1 bg-white hover:bg-[#F3F4F6] text-[#4B5563] font-medium rounded-md border border-[#D1D5DB] transition-colors cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(q.id)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-[#FDF2F2] hover:bg-[#FCE8E8] text-[#9E2A2B] border border-[#F5C2C2] font-semibold flex items-center gap-1 cursor-pointer justify-center transition-colors"
                          title="ลบคำถามนี้ออกจากรายการ"
                        >
                          <Trash2 className="w-3 h-3 text-[#9E2A2B]" />
                          <span>ลบคำถาม</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
