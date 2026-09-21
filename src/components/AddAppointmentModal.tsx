import React, { useMemo, useState } from 'react';
import { X, Calendar, Search, CheckCircle2, Building2, UserRound, Home, Pencil } from 'lucide-react';
import { B2BAppointment, B2BLead, AppointmentStatus } from '../types';

interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: B2BAppointment) => Promise<boolean>;
  leads: B2BLead[];
  editAppointment?: B2BAppointment | null;
  defaultDate?: string;
  defaultLead?: B2BLead | null;
  onEditLead?: (lead: B2BLead) => void;
}

const show = (value?: string | number | null) =>
  value === undefined || value === null || String(value).trim() === '' ? 'ยังไม่ระบุ' : String(value);

export const AddAppointmentModal: React.FC<AddAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
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
  const [date, setDate] = useState(editAppointment?.date || defaultDate || new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(editAppointment?.time || '10:00');
  const [status, setStatus] = useState<AppointmentStatus>(editAppointment?.status || 'scheduled');
  const [title, setTitle] = useState(editAppointment?.title || '');
  const [location, setLocation] = useState(editAppointment?.location || '');
  const [notes, setNotes] = useState(editAppointment?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) || leads.find((lead) => lead.name === leadName),
    [leads, selectedLeadId, leadName]
  );

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !date || !time || isSaving) return;

    const apt: B2BAppointment = {
      id: editAppointment?.id || `APT-${crypto.randomUUID()}`,
      leadId: selectedLead?.id || selectedLeadId || undefined,
      leadName: leadName.trim(),
      date,
      time,
      title: title.trim() || 'นัดหมายเข้าพบลูกค้า',
      location: location.trim() || 'ที่ทำการ / สำนักงานของหน่วยงานลูกค้า',
      objective: editAppointment?.objective || 'อื่นๆ',
      status,
      contactPerson: selectedLead?.contactPerson || editAppointment?.contactPerson || '',
      phone: selectedLead?.phone || editAppointment?.phone || '',
      priority: selectedLead?.priority || editAppointment?.priority || 'B',
      notes: notes.trim(),
      createdAt: editAppointment?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setIsSaving(true);
    setSaveError('');
    try {
      if (await onSave(apt)) onClose();
      else setSaveError('บันทึกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่');
    } catch {
      setSaveError('บันทึกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSaving(false);
    }
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
              <h2 className="text-base font-bold">{editAppointment ? 'รายละเอียด / แก้ไขนัดหมาย' : 'เพิ่มนัดหมาย'}</h2>
              <p className="text-xs text-[#C5E1D0]">เลือกองค์กรแล้วดูข้อมูลพร้อมใช้ โดยไม่ทับข้อมูลหลัก</p>
            </div>
          </div>
          <button disabled={isSaving} onClick={onClose} className="p-2 rounded-xl hover:bg-white/20 text-white/80">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-sm text-[#1B3E2D] overflow-y-auto">
          <div className="relative">
            <label className="block text-xs font-bold text-[#305340] mb-1">
              ค้นหาองค์กร / หน่วยงาน <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#789686]" />
              <input
                type="text"
                required
                autoComplete="off"
                value={leadName}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setLeadName(e.target.value);
                  setSelectedLeadId('');
                  setSearchOpen(true);
                }}
                placeholder="พิมพ์ชื่อองค์กร..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#D5E2D2] focus:border-[#2D5A43] outline-none"
              />
            </div>
            {searchOpen && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-[#D5E2D2] rounded-2xl shadow-xl max-h-56 overflow-y-auto">
                {filteredLeads.length ? filteredLeads.map((lead) => (
                  <button key={lead.id} type="button" onClick={() => chooseLead(lead)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-[#F1F7EF] border-b last:border-b-0 border-[#EEF3EC]">
                    <div className="text-xs font-bold text-[#183A28]">{lead.name}</div>
                    <div className="text-[10px] text-[#789686] mt-0.5">
                      {lead.orgType || lead.categoryType || 'ยังไม่ระบุประเภท'} · Priority {lead.priority}
                    </div>
                  </button>
                )) : <div className="px-3.5 py-3 text-xs text-[#789686]">ไม่พบองค์กรในฐานข้อมูล</div>}
              </div>
            )}
          </div>

          {selectedLead && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#DDE8DA] bg-[#F7FBF5] p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-[#214A34]"><UserRound className="w-4 h-4"/>ข้อมูลฝั่งลูกค้า</div>
                <div className="text-xs space-y-1 text-[#4F6C5B]">
                  <p><strong>ผู้ติดต่อ:</strong> {show(selectedLead.contactPerson)}</p>
                  <p><strong>ตำแหน่ง:</strong> {show(selectedLead.contactPosition)}</p>
                  <p><strong>โทร:</strong> {show(selectedLead.phone)}</p>
                  <p><strong>อีเมล / LINE:</strong> {show(selectedLead.email || selectedLead.lineId)}</p>
                  <p><strong>ประเภทงาน:</strong> {show(selectedLead.eventType)}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-[#E8E1CD] bg-[#FFFCF4] p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-[#735518]"><Home className="w-4 h-4"/>ข้อมูลฝั่งบ้านโฮม</div>
                <div className="text-xs space-y-1 text-[#6E633F]">
                  <p><strong>ผู้ประสานงานบ้านโฮม:</strong> {show(selectedLead.baanHomeCoordinatorName)}</p>
                  <p><strong>ข้อเสนอที่ควรชู:</strong> {selectedLead.featuredOffers?.length ? selectedLead.featuredOffers.join(', ') : show(selectedLead.offer || selectedLead.proposalOffer)}</p>
                  <p><strong>เหตุผลที่ควรเข้าพบ:</strong> {show(selectedLead.reasonsToApproach)}</p>
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

          <div className="rounded-2xl border border-[#E2EAE0] p-4 space-y-3">
            <h3 className="text-xs font-bold text-[#183A28]">รายละเอียดนัดหมายครั้งนี้</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="space-y-1"><span className="text-xs font-bold">วันที่นัดหมาย *</span><input type="date" required value={date} onChange={e=>setDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border"/></label>
              <label className="space-y-1"><span className="text-xs font-bold">เวลา *</span><input type="time" required value={time} onChange={e=>setTime(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border"/></label>
              <label className="space-y-1"><span className="text-xs font-bold">สถานะ</span><select value={status} onChange={e=>setStatus(e.target.value as AppointmentStatus)} className="w-full px-3 py-2.5 rounded-xl border bg-white"><option value="scheduled">🟢 รอเข้าพบ</option><option value="completed">✅ พบแล้ว</option><option value="not_met">🔴 ไม่ได้เข้าพบ</option><option value="rescheduled">🟡 เลื่อนนัด</option><option value="cancelled">⚫ ยกเลิกนัด</option></select></label>
            </div>
            <label className="space-y-1 block"><span className="text-xs font-bold">เรื่องที่จะเข้าพบ</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="เช่น นำเสนอแพ็กเกจประชุมและอาหารว่าง" className="w-full px-3 py-2.5 rounded-xl border"/></label>
            <label className="space-y-1 block"><span className="text-xs font-bold">สถานที่นัดหมาย</span><input value={location} onChange={e=>setLocation(e.target.value)} placeholder="สำนักงานลูกค้า / บ้านโฮม / ออนไลน์" className="w-full px-3 py-2.5 rounded-xl border"/></label>
            <label className="space-y-1 block"><span className="text-xs font-bold">หมายเหตุ / ผลการเข้าพบ</span><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="บันทึกเฉพาะนัดนี้ เช่น สิ่งที่ลูกค้าสนใจ ผลการพูดคุย หรือนัดครั้งถัดไป" className="w-full px-3 py-2.5 rounded-xl border"/></label>
          </div>

          {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
          <div className="pt-2 border-t flex justify-end gap-2.5">
            <button type="button" disabled={isSaving} onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-[#5B7967]">ยกเลิก</button>
            <button disabled={isSaving || !selectedLeadId} type="submit" className="px-5 py-2 rounded-xl text-sm font-bold bg-[#1B3E2D] text-white shadow-md flex items-center gap-1.5 disabled:opacity-50">
              <CheckCircle2 className="w-4 h-4" /><span>{isSaving ? 'กำลังบันทึก…' : editAppointment ? 'บันทึกผล / การแก้ไข' : 'บันทึกนัดหมาย'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
