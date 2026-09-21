import React, { useMemo, useState } from 'react';
import { X, Calendar, Search, CheckCircle2 } from 'lucide-react';
import { B2BAppointment, B2BLead, AppointmentStatus } from '../types';

interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: B2BAppointment) => Promise<boolean>;
  leads: B2BLead[];
  editAppointment?: B2BAppointment | null;
  defaultDate?: string;
  defaultLead?: B2BLead | null;
}

export const AddAppointmentModal: React.FC<AddAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  leads,
  editAppointment,
  defaultDate,
  defaultLead,
}) => {
  const initialLeadName = editAppointment?.leadName || defaultLead?.name || '';
  const [selectedLeadId, setSelectedLeadId] = useState(editAppointment?.leadId || defaultLead?.id || '');
  const [leadName, setLeadName] = useState(initialLeadName);
  const [searchOpen, setSearchOpen] = useState(false);
  const [date, setDate] = useState(editAppointment?.date || defaultDate || new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(editAppointment?.time || '10:00');
  const [status, setStatus] = useState<AppointmentStatus>(editAppointment?.status || 'scheduled');
  const [contactPerson, setContactPerson] = useState(editAppointment?.contactPerson || defaultLead?.contactPerson || '');
  const [phone, setPhone] = useState(editAppointment?.phone || defaultLead?.phone || '');
  const [notes, setNotes] = useState(editAppointment?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const filteredLeads = useMemo(() => {
    const q = leadName.trim().toLowerCase();
    if (!q) return leads.slice(0, 10);
    return leads
      .filter((lead) =>
        [lead.name, lead.contactPerson, lead.district, lead.orgType]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [leadName, leads]);

  if (!isOpen) return null;

  const chooseLead = (lead: B2BLead) => {
    setSelectedLeadId(lead.id);
    setLeadName(lead.name);
    setContactPerson(lead.contactPerson || '');
    setPhone(lead.phone || '');
    setSearchOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !date || !time || isSaving) return;

    const selectedLead = leads.find((lead) => lead.id === selectedLeadId);
    const apt: B2BAppointment = {
      id: editAppointment?.id || `APT-${crypto.randomUUID()}`,
      leadId: selectedLeadId || undefined,
      leadName: leadName.trim(),
      date,
      time,
      title: editAppointment?.title || 'นัดหมายเข้าพบลูกค้า',
      location: editAppointment?.location || 'ที่ทำการ / สำนักงานของหน่วยงานลูกค้า',
      objective: editAppointment?.objective || 'นำเสนอแพ็กเกจห้องประชุม & Corporate Rate',
      status,
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      priority: editAppointment?.priority || selectedLead?.priority || defaultLead?.priority || 'B',
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
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full my-6 overflow-hidden border border-[#E3ECE1]">
        <div className="bg-gradient-to-r from-[#1B3E2D] to-[#34664C] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#E6F4EA]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {editAppointment ? 'แก้ไขกำหนดการนัดหมาย' : 'เพิ่มนัดหมาย'}
              </h2>
              <p className="text-xs text-[#C5E1D0]">ลงนัดให้เร็ว ใช้เฉพาะข้อมูลที่จำเป็น</p>
            </div>
          </div>
          <button disabled={isSaving} onClick={onClose} className="p-2 rounded-xl hover:bg-white/20 text-white/80">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-sm text-[#1B3E2D]">
          <div className="relative">
            <label className="block text-xs font-bold text-[#305340] mb-1">
              หน่วยงาน / ศูนย์ประสานงาน <span className="text-red-500">*</span>
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
                placeholder="พิมพ์ชื่อหน่วยงานเพื่อค้นหา..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#D5E2D2] focus:border-[#2D5A43] outline-none"
              />
            </div>

            {searchOpen && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-[#D5E2D2] rounded-2xl shadow-xl max-h-56 overflow-y-auto">
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead) => (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => chooseLead(lead)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-[#F1F7EF] border-b last:border-b-0 border-[#EEF3EC]"
                    >
                      <div className="text-xs font-bold text-[#183A28]">{lead.name}</div>
                      <div className="text-[10px] text-[#789686] mt-0.5">
                        Priority {lead.priority}{lead.district ? ` • ${lead.district}` : ''}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3.5 py-3 text-xs text-[#789686]">
                    ไม่พบในรายชื่อ — สามารถใช้ชื่อที่พิมพ์เป็นหน่วยงานใหม่ได้
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">วันที่นัดหมาย *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#D5E2D2] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">เวลา *</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#D5E2D2] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">สถานะ</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#D5E2D2] text-xs bg-white"
              >
                <option value="scheduled">🟢 รอเข้าพบ</option>
                <option value="completed">✅ พบแล้ว</option>
                <option value="not_met">🔴 ไม่ได้เข้าพบ</option>
                <option value="rescheduled">🟡 เลื่อนนัด</option>
                <option value="cancelled">⚫ ยกเลิกนัด</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">ผู้ประสานงาน <span className="font-normal text-[#789686]">(ถ้ามี)</span></label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="ชื่อ / ตำแหน่ง"
                className="w-full px-3 py-2.5 rounded-xl border border-[#D5E2D2] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">เบอร์โทร <span className="font-normal text-[#789686]">(ถ้ามี)</span></label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="เบอร์โทรศัพท์"
                className="w-full px-3 py-2.5 rounded-xl border border-[#D5E2D2] text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#305340] mb-1">หมายเหตุ <span className="font-normal text-[#789686]">(ถ้ามี)</span></label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="สิ่งที่ต้องเตรียม / ข้อมูลเพิ่มเติมสั้น ๆ"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D2] text-xs"
            />
          </div>

          {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}

          <div className="pt-3 border-t border-[#E3ECE1] flex items-center justify-end gap-2.5">
            <button type="button" disabled={isSaving} onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-[#5B7967] hover:bg-[#F2F6F1]">
              ยกเลิก
            </button>
            <button disabled={isSaving} type="submit" className="px-5 py-2 rounded-xl text-sm font-bold bg-[#1B3E2D] hover:bg-[#25503B] text-white shadow-md flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึก…' : editAppointment ? 'บันทึกการแก้ไข' : 'บันทึกนัดหมาย'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
