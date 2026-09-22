import React, { useMemo, useState } from 'react';
import {
  X,
  Calendar,
  Search,
  CheckCircle2,
  UserRound,
  Home,
  Pencil,
  RefreshCw,
  Ban,
  ClipboardCheck,
} from 'lucide-react';
import { B2BAppointment, B2BLead, B2BPipelineStatus } from '../types';
import { localDateKey } from '../utils/dateUtils';

interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: B2BAppointment) => Promise<boolean>;
  onReschedule: (appointment: B2BAppointment, newDate: string, newTime: string, reason: string) => Promise<boolean>;
  onComplete: (appointment: B2BAppointment, nextStage: B2BPipelineStatus, resultNote: string) => Promise<boolean>;
  onCancelAppointment: (appointment: B2BAppointment, reason: string) => Promise<boolean>;
  leads: B2BLead[];
  editAppointment?: B2BAppointment | null;
  defaultDate?: string;
  defaultLead?: B2BLead | null;
  onEditLead?: (lead: B2BLead) => void;
}

const show = (value?: string | number | null) =>
  value === undefined || value === null || String(value).trim() === '' ? 'ยังไม่ระบุ' : String(value);

const stageClass = (stage: string) => {
  if (stage === 'ปิดการขาย') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (stage === 'ตกลง Partnership') return 'bg-teal-100 text-teal-800 border-teal-200';
  if (stage === 'ส่งใบเสนอราคาแล้ว') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (stage === 'นัดเข้าพบ') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (stage === 'ติดต่อแล้ว') return 'bg-lime-100 text-lime-800 border-lime-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

export const AddAppointmentModal: React.FC<AddAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onReschedule,
  onComplete,
  onCancelAppointment,
  leads,
  editAppointment,
  defaultDate,
  defaultLead,
  onEditLead,
}) => {
  const initialLeadName = editAppointment?.leadName || defaultLead?.name || '';
  const [selectedLeadId, setSelectedLeadId] = useState(editAppointment?.leadId || defaultLead?.id || '');
  const [leadName, setLeadName] = useState(initialLeadName);
  const [searchOpen, setSearchOpen] = useState(false);
  const [date, setDate] = useState(editAppointment?.date || defaultDate || localDateKey());
  const [time, setTime] = useState(editAppointment?.time || '10:00');
  const [title, setTitle] = useState(editAppointment?.title || '');
  const [location, setLocation] = useState(editAppointment?.location || '');
  const [notes, setNotes] = useState(editAppointment?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [actionMode, setActionMode] = useState<'none' | 'reschedule' | 'complete' | 'cancel'>('none');
  const [newDate, setNewDate] = useState(editAppointment?.date || defaultDate || localDateKey());
  const [newTime, setNewTime] = useState(editAppointment?.time || '10:00');
  const [reason, setReason] = useState('');
  const [resultNote, setResultNote] = useState(editAppointment?.resultNote || '');
  const [nextStage, setNextStage] = useState<B2BPipelineStatus>('ส่งใบเสนอราคาแล้ว');

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) || leads.find((lead) => lead.name === leadName),
    [leads, selectedLeadId, leadName]
  );

  const currentStage = selectedLead?.pipelineStage || selectedLead?.contactStatus || 'ยังไม่ติดต่อ';
  const isClosedAppointment = editAppointment?.status === 'completed' || editAppointment?.status === 'cancelled';

  const filteredLeads = useMemo(() => {
    const q = leadName.trim().toLowerCase();
    if (!q) return leads.slice(0, 10);
    return leads
      .filter((lead) =>
        [lead.name, lead.contactPerson, lead.contactPosition, lead.district, lead.orgType]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [leadName, leads]);

  if (!isOpen) return null;

  const chooseLead = (lead: B2BLead) => {
    setSelectedLeadId(lead.id);
    setLeadName(lead.name);
    setSearchOpen(false);
  };

  const buildAppointment = (): B2BAppointment => ({
    ...(editAppointment || {}),
    id: editAppointment?.id || `APT-${crypto.randomUUID()}`,
    leadId: selectedLead?.id || selectedLeadId || undefined,
    leadName: leadName.trim(),
    date,
    time,
    title: title.trim() || 'นัดหมายเข้าพบลูกค้า',
    location: location.trim() || 'ที่ทำการ / สำนักงานของหน่วยงานลูกค้า',
    objective: editAppointment?.objective || 'อื่นๆ',
    status: editAppointment?.status || 'scheduled',
    contactPerson: selectedLead?.contactPerson || editAppointment?.contactPerson || '',
    phone: selectedLead?.phone || editAppointment?.phone || '',
    priority: selectedLead?.priority || editAppointment?.priority || 'B',
    notes: notes.trim(),
    createdAt: editAppointment?.createdAt || localDateKey(),
    updatedAt: localDateKey(),
  });

  const runAction = async (fn: () => Promise<boolean>) => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const ok = await fn();
      if (ok) onClose();
      else setSaveError('บันทึกไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองใหม่');
    } catch {
      setSaveError('บันทึกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !date || !time || isSaving) return;
    await runAction(() => onSave(buildAppointment()));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full my-5 overflow-hidden border border-[#E3ECE1] max-h-[92vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#1B3E2D] to-[#34664C] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/15 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#E6F4EA]" />
            </div>
            <div>
              <h2 className="text-base font-bold">{editAppointment ? 'จัดการนัดเข้าพบ' : 'นัดเข้าพบ'}</h2>
              <p className="text-xs text-[#C5E1D0]">
                {editAppointment ? 'ทำงานต่อจากนัดนี้: เข้าพบแล้ว / เลื่อนนัด / ยกเลิกนัด' : 'เลือกวันนัดแล้วระบบจะอัปเดตองค์กรและปฏิทินพร้อมกัน'}
              </p>
            </div>
          </div>
          <button disabled={isSaving} onClick={onClose} className="p-2 rounded-xl hover:bg-white/20 text-white/80">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-sm text-[#1B3E2D] overflow-y-auto">
          <div className="relative">
            <label className="block text-xs font-bold text-[#305340] mb-1">
              องค์กร / หน่วยงาน <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#789686]" />
              <input
                type="text"
                required
                autoComplete="off"
                value={leadName}
                disabled={!!editAppointment}
                onFocus={() => !editAppointment && setSearchOpen(true)}
                onChange={(e) => {
                  setLeadName(e.target.value);
                  setSelectedLeadId('');
                  setSearchOpen(true);
                }}
                placeholder="พิมพ์ชื่อองค์กร..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#D5E2D2] focus:border-[#2D5A43] outline-none disabled:bg-[#F5F7F4]"
              />
            </div>
            {searchOpen && !editAppointment && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-[#D5E2D2] rounded-2xl shadow-xl max-h-56 overflow-y-auto">
                {filteredLeads.length ? filteredLeads.map((lead) => (
                  <button key={lead.id} type="button" onClick={() => chooseLead(lead)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-[#F1F7EF] border-b last:border-b-0 border-[#EEF3EC]">
                    <div className="text-xs font-bold text-[#183A28]">{lead.name}</div>
                    <div className="text-[10px] text-[#789686] mt-0.5">
                      {lead.orgType || lead.categoryType || 'ยังไม่ระบุประเภท'} · {lead.pipelineStage || lead.contactStatus || 'ยังไม่ติดต่อ'}
                    </div>
                  </button>
                )) : <div className="px-3.5 py-3 text-xs text-[#789686]">ไม่พบองค์กรในฐานข้อมูล</div>}
              </div>
            )}
          </div>

          {selectedLead && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#DDE8DA] bg-[#F7FBF5] p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-[#214A34]"><UserRound className="w-4 h-4"/>ข้อมูลลูกค้า</div>
                <div className="text-xs space-y-1 text-[#4F6C5B]">
                  <p><strong>ผู้ติดต่อ:</strong> {show(selectedLead.contactPerson)}</p>
                  <p><strong>ตำแหน่ง:</strong> {show(selectedLead.contactPosition)}</p>
                  <p><strong>โทร:</strong> {show(selectedLead.phone)}</p>
                  <p><strong>ประเภทงาน:</strong> {show(selectedLead.eventType)}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-[#E8E1CD] bg-[#FFFCF4] p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-[#735518]"><Home className="w-4 h-4"/>สถานะงาน</div>
                <div className="text-xs space-y-2 text-[#6E633F]">
                  <span className={`inline-flex px-2.5 py-1 rounded-full border font-bold ${stageClass(currentStage)}`}>{currentStage}</span>
                  <p><strong>ผู้ประสานงานบ้านโฮม:</strong> {show(selectedLead.baanHomeCoordinatorName)}</p>
                  <p><strong>ขั้นตอนถัดไป:</strong> {show(selectedLead.nextAction)}</p>
                </div>
              </div>
              {onEditLead && (
                <div className="md:col-span-2 flex justify-end">
                  <button type="button" onClick={() => onEditLead(selectedLead)} className="text-xs font-bold text-[#24563B] flex items-center gap-1 hover:underline">
                    <Pencil className="w-3.5 h-3.5"/> แก้ไขข้อมูลหน่วยงาน
                  </button>
                </div>
              )}
            </div>
          )}

          {editAppointment && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-blue-900">นัดปัจจุบัน</div>
                  <div className="text-sm font-bold text-blue-800">📅 {editAppointment.date} · ⏰ {editAppointment.time} น.</div>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  editAppointment.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                  editAppointment.status === 'cancelled' ? 'bg-slate-200 text-slate-700' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {editAppointment.status === 'completed' ? 'เข้าพบแล้ว' : editAppointment.status === 'cancelled' ? 'ยกเลิกนัดแล้ว' : 'รอเข้าพบ'}
                </span>
              </div>

              {!isClosedAppointment && (
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setActionMode(actionMode === 'complete' ? 'none' : 'complete')} className="py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1">
                    <ClipboardCheck className="w-4 h-4"/> เข้าพบแล้ว
                  </button>
                  <button type="button" onClick={() => { setActionMode(actionMode === 'reschedule' ? 'none' : 'reschedule'); setNewDate(editAppointment.date); setNewTime(editAppointment.time); }} className="py-2 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center gap-1">
                    <RefreshCw className="w-4 h-4"/> เลื่อนนัด
                  </button>
                  <button type="button" onClick={() => setActionMode(actionMode === 'cancel' ? 'none' : 'cancel')} className="py-2 rounded-xl bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1">
                    <Ban className="w-4 h-4"/> ยกเลิกนัด
                  </button>
                </div>
              )}

              {actionMode === 'reschedule' && editAppointment && (
                <div className="rounded-xl bg-white border border-amber-200 p-3 space-y-2">
                  <div className="text-xs font-bold text-amber-800">เลื่อนนัดไปวันใหม่</div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1"><span className="text-xs font-bold">วันที่ใหม่ *</span><input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border"/></label>
                    <label className="space-y-1"><span className="text-xs font-bold">เวลาใหม่ *</span><input type="time" value={newTime} onChange={e=>setNewTime(e.target.value)} className="w-full px-3 py-2 rounded-xl border"/></label>
                  </div>
                  <label className="space-y-1 block"><span className="text-xs font-bold">เหตุผลที่เลื่อน (ไม่บังคับ)</span><textarea rows={2} value={reason} onChange={e=>setReason(e.target.value)} className="w-full px-3 py-2 rounded-xl border"/></label>
                  <button
                    type="button"
                    disabled={isSaving || !newDate || !newTime || (newDate === editAppointment.date && newTime === editAppointment.time)}
                    onClick={() => runAction(() => onReschedule(editAppointment, newDate, newTime, reason))}
                    className="w-full py-2 rounded-xl bg-amber-600 text-white text-xs font-bold disabled:opacity-50"
                  >
                    ยืนยันเลื่อนนัด
                  </button>
                </div>
              )}

              {actionMode === 'complete' && editAppointment && (
                <div className="rounded-xl bg-white border border-emerald-200 p-3 space-y-2">
                  <div className="text-xs font-bold text-emerald-800">บันทึกผลหลังเข้าพบ</div>
                  <label className="space-y-1 block">
                    <span className="text-xs font-bold">สถานะถัดไป</span>
                    <select value={nextStage} onChange={e=>setNextStage(e.target.value as B2BPipelineStatus)} className="w-full px-3 py-2 rounded-xl border bg-white">
                      <option value="นัดเข้าพบ">ยังอยู่ขั้นนัดเข้าพบ</option>
                      <option value="ส่งใบเสนอราคาแล้ว">ส่งใบเสนอราคาแล้ว</option>
                      <option value="ตกลง Partnership">ตกลง Partnership</option>
                      <option value="ปิดการขาย">ปิดการขาย</option>
                    </select>
                  </label>
                  <label className="space-y-1 block"><span className="text-xs font-bold">ผลการเข้าพบ / สิ่งที่ต้องทำต่อ</span><textarea rows={3} value={resultNote} onChange={e=>setResultNote(e.target.value)} placeholder="เช่น ลูกค้าขอใบเสนอราคา 30 ท่าน" className="w-full px-3 py-2 rounded-xl border"/></label>
                  <button type="button" disabled={isSaving} onClick={() => runAction(() => onComplete(editAppointment, nextStage, resultNote))} className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50">
                    บันทึกว่าเข้าพบแล้ว
                  </button>
                </div>
              )}

              {actionMode === 'cancel' && editAppointment && (
                <div className="rounded-xl bg-white border border-rose-200 p-3 space-y-2">
                  <div className="text-xs font-bold text-rose-700">ยกเลิกนัดหมาย</div>
                  <label className="space-y-1 block"><span className="text-xs font-bold">เหตุผล (ไม่บังคับ)</span><textarea rows={2} value={reason} onChange={e=>setReason(e.target.value)} className="w-full px-3 py-2 rounded-xl border"/></label>
                  <div className="text-[11px] text-rose-700">ถ้าไม่มีนัดอื่นและองค์กรยังอยู่ขั้น “นัดเข้าพบ” ระบบจะกลับเป็น “ติดต่อแล้ว” อัตโนมัติ</div>
                  <button type="button" disabled={isSaving} onClick={() => runAction(() => onCancelAppointment(editAppointment, reason))} className="w-full py-2 rounded-xl bg-rose-600 text-white text-xs font-bold disabled:opacity-50">
                    ยืนยันยกเลิกนัด
                  </button>
                </div>
              )}

              {!!editAppointment.rescheduleHistory?.length && (
                <details className="text-[11px] text-[#62766A]">
                  <summary className="cursor-pointer font-bold">ประวัติเลื่อนนัด ({editAppointment.rescheduleHistory.length})</summary>
                  <div className="mt-2 space-y-1.5">
                    {[...editAppointment.rescheduleHistory].reverse().map((item) => (
                      <div key={item.id} className="rounded-lg bg-white/80 border border-blue-100 px-2 py-1.5">
                        {item.fromDate} {item.fromTime} → <strong>{item.toDate} {item.toTime}</strong>
                        {item.reason ? ` · ${item.reason}` : ''}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-[#E2EAE0] p-4 space-y-3">
            <h3 className="text-xs font-bold text-[#183A28]">{editAppointment ? 'รายละเอียดนัดหมาย' : 'กำหนดวันนัดเข้าพบ'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1"><span className="text-xs font-bold">วันที่นัดหมาย *</span><input type="date" required disabled={!!editAppointment} value={date} onChange={e=>setDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border disabled:bg-[#F5F7F4]"/></label>
              <label className="space-y-1"><span className="text-xs font-bold">เวลา *</span><input type="time" required disabled={!!editAppointment} value={time} onChange={e=>setTime(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border disabled:bg-[#F5F7F4]"/></label>
            </div>
            {!editAppointment && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-[11px] text-blue-800 font-medium">
                บันทึกแล้ว → สถานะองค์กรเป็น “นัดเข้าพบ” และนัดจะขึ้นในปฏิทินทันที
              </div>
            )}
            {editAppointment && <div className="text-[11px] text-[#73877B]">ต้องการเปลี่ยนวัน/เวลา ให้ใช้ปุ่ม “เลื่อนนัด” ด้านบน เพื่อเก็บประวัติให้ครบ</div>}
            <label className="space-y-1 block"><span className="text-xs font-bold">เรื่องที่จะเข้าพบ</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="เช่น นำเสนอแพ็กเกจประชุมและอาหารว่าง" className="w-full px-3 py-2.5 rounded-xl border"/></label>
            <label className="space-y-1 block"><span className="text-xs font-bold">สถานที่นัดหมาย</span><input value={location} onChange={e=>setLocation(e.target.value)} placeholder="สำนักงานลูกค้า / บ้านโฮม / ออนไลน์" className="w-full px-3 py-2.5 rounded-xl border"/></label>
            <label className="space-y-1 block"><span className="text-xs font-bold">หมายเหตุ</span><textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="รายละเอียดเฉพาะนัดนี้" className="w-full px-3 py-2.5 rounded-xl border"/></label>
          </div>

          {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
          <div className="pt-2 border-t flex justify-end gap-2.5">
            <button type="button" disabled={isSaving} onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-[#5B7967]">ปิด</button>
            {!isClosedAppointment && (
              <button disabled={isSaving || !selectedLeadId} type="submit" className="px-5 py-2 rounded-xl text-sm font-bold bg-[#1B3E2D] text-white shadow-md flex items-center gap-1.5 disabled:opacity-50">
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? 'กำลังบันทึก…' : editAppointment ? 'บันทึกรายละเอียด' : 'บันทึกนัดเข้าพบ'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
