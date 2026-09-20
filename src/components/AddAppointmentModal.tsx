import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, User, Phone, Users, CheckCircle2 } from 'lucide-react';
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

const OBJECTIVES = [
  'นำเสนอแพ็กเกจห้องประชุม & Corporate Rate',
  'ชิมอาหาร & สำรวจสถานที่จริง (Site Visit)',
  'ส่งใบเสนอราคา & ลงนามข้อตกลง',
  'ประสานงานจัดงานจริง & เตรียมห้อง',
  'ติดตามผลงานอบรม & สานสัมพันธ์',
  'อื่นๆ',
] as const;

const VENUES = [
  'บ้านโฮม สวนอาหาร&รีสอร์ท (ห้อง VIP 1)',
  'บ้านโฮม สวนอาหาร&รีสอร์ท (ห้อง VIP 2)',
  'บ้านโฮม สวนอาหาร&รีสอร์ท (ซุ้มริมน้ำ & สวน)',
  'ที่ทำการ / สำนักงานของหน่วยงานลูกค้า',
  'นัดหมายออนไลน์ / ทางโทรศัพท์',
];

export const AddAppointmentModal: React.FC<AddAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  leads,
  editAppointment,
  defaultDate,
  defaultLead,
}) => {
  const [selectedLeadId, setSelectedLeadId] = useState<string>(
    editAppointment?.leadId || defaultLead?.id || ''
  );
  const [leadName, setLeadName] = useState<string>(
    editAppointment?.leadName || defaultLead?.name || ''
  );
  const [title, setTitle] = useState(
    editAppointment?.title || 'นัดหมายนำเสนอแพ็กเกจห้องประชุม & ชิมอาหาร'
  );
  const [date, setDate] = useState(
    editAppointment?.date || defaultDate || '2026-09-10'
  );
  const [time, setTime] = useState(editAppointment?.time || '10:00');
  const [location, setLocation] = useState(
    editAppointment?.location || VENUES[0]
  );
  const [objective, setObjective] = useState<B2BAppointment['objective']>(
    editAppointment?.objective || OBJECTIVES[0]
  );
  const [contactPerson, setContactPerson] = useState(
    editAppointment?.contactPerson || defaultLead?.contactPerson || ''
  );
  const [phone, setPhone] = useState(
    editAppointment?.phone || defaultLead?.phone || ''
  );
  const [attendeesCount, setAttendeesCount] = useState<number>(
    editAppointment?.attendeesCount || 25
  );
  const [assignedStaff, setAssignedStaff] = useState(
    editAppointment?.assignedStaff || 'น้องณภัทร (ฝ่ายขาย & MICE)'
  );
  const [status, setStatus] = useState<AppointmentStatus>(
    editAppointment?.status || 'scheduled'
  );
  const [notes, setNotes] = useState(editAppointment?.notes || '');
  const [priority, setPriority] = useState<'A' | 'B' | 'C'>(
    editAppointment?.priority || defaultLead?.priority || 'A'
  );

  useEffect(() => {
    if (selectedLeadId) {
      const match = leads.find((l) => l.id === selectedLeadId);
      if (match) {
        setLeadName(match.name);
        if (!contactPerson && match.contactPerson) setContactPerson(match.contactPerson);
        if (!phone && match.phone) setPhone(match.phone);
        setPriority(match.priority);
      }
    }
  }, [selectedLeadId, leads]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !date || isSaving) return;

    const apt: B2BAppointment = {
      id: editAppointment?.id || `APT-${crypto.randomUUID()}`,
      leadId: selectedLeadId || undefined,
      leadName: leadName.trim(),
      date,
      time,
      title: title.trim() || 'นัดหมายประสานงาน B2B',
      location,
      objective,
      status,
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      attendeesCount: Number(attendeesCount) || undefined,
      assignedStaff,
      priority,
      notes: notes.trim(),
      createdAt: editAppointment?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setIsSaving(true);
    setSaveError('');
    try {
      if (await onSave(apt)) onClose();
      else setSaveError('บันทึกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่');
    } catch { setSaveError('บันทึกไม่สำเร็จ กรุณาลองใหม่'); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full my-6 overflow-hidden border border-[#E3ECE1] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1B3E2D] to-[#34664C] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#E6F4EA]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {editAppointment ? 'แก้ไขกำหนดการนัดหมาย' : 'ลงตารางนัดหมาย B2B ใหม่'}
              </h2>
              <p className="text-xs text-[#C5E1D0]">
                บันทึกลงปฏิทินนัดหมายของทีมบ้านโฮม สวนอาหาร&รีสอร์ท
              </p>
            </div>
          </div>
          <button
            disabled={isSaving}
              onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 transition-colors text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-sm text-[#1B3E2D]">
          {/* Select Lead or Type */}
          <div>
            <label className="block text-xs font-bold text-[#305340] mb-1">
              เลือกหน่วยงาน / ศูนย์ประสานงานเป้าหมาย <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={selectedLeadId}
                onChange={(e) => {
                  setSelectedLeadId(e.target.value);
                  const found = leads.find((l) => l.id === e.target.value);
                  if (found) {
                    setLeadName(found.name);
                    setContactPerson(found.contactPerson || '');
                    setPhone(found.phone || '');
                    setPriority(found.priority);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-[#D5E2D2] text-xs bg-white focus:border-[#2D5A43]"
              >
                <option value="">-- เลือกจาก 101 หน่วยงานในระบบ --</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    [{l.priority}] {l.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                required
                value={leadName}
                onChange={(e) => {
                  setLeadName(e.target.value);
                  setSelectedLeadId('');
                }}
                placeholder="หรือพิมพ์ชื่อหน่วยงานเอง"
                className="w-full px-3 py-2 rounded-xl border border-[#D5E2D2] text-xs focus:border-[#2D5A43]"
              />
            </div>
          </div>

          {/* Title / Purpose */}
          <div>
            <label className="block text-xs font-bold text-[#305340] mb-1">
              หัวข้อ / รายละเอียดนัดหมาย
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น นัดเข้าพบ ผอ. และชิมเมนูอาหารว่าง"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D2] focus:border-[#2D5A43] text-xs sm:text-sm"
            />
          </div>

          {/* Date, Time & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                วันที่นัดหมาย <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5E2D2] text-xs focus:border-[#2D5A43]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                เวลา <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5E2D2] text-xs focus:border-[#2D5A43]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                ความสำคัญ (Priority)
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'A' | 'B' | 'C')}
                className="w-full px-3 py-2 rounded-xl border border-[#D5E2D2] text-xs bg-white"
              >
                <option value="A">Priority A (ด่วน/งบสูง)</option>
                <option value="B">Priority B (ปานกลาง)</option>
                <option value="C">Priority C (ทั่วไป)</option>
              </select>
            </div>
          </div>

          {/* Objective & Venue */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                วัตถุประสงค์การนัด
              </label>
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value as B2BAppointment['objective'])}
                className="w-full px-3 py-2 rounded-xl border border-[#D5E2D2] text-xs bg-white"
              >
                {OBJECTIVES.map((obj) => (
                  <option key={obj} value={obj}>
                    {obj}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                สถานที่นัดหมาย (Venue)
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D5E2D2] text-xs bg-white"
              >
                {VENUES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Person, Phone & Attendees */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                ผู้ประสานงาน
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="ชื่อ-ตำแหน่ง"
                className="w-full px-3 py-2 rounded-xl border border-[#D5E2D2] text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                เบอร์โทรศัพท์
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="043-xxx หรือ 08x-xxx"
                className="w-full px-3 py-2 rounded-xl border border-[#D5E2D2] text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                จำนวนผู้เข้าร่วม (คน)
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={attendeesCount}
                onChange={(e) => setAttendeesCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#D5E2D2] text-xs"
              />
            </div>
          </div>

          {/* Assigned Staff & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                เจ้าหน้าที่รับผิดชอบ (Assigned Staff)
              </label>
              <select
                value={assignedStaff}
                onChange={(e) => setAssignedStaff(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D5E2D2] text-xs bg-white"
              >
                <option value="น้องณภัทร (ฝ่ายขาย & MICE)">น้องณภัทร (ฝ่ายขาย & MICE)</option>
                <option value="น้องแพรวา (ลูกค้าสัมพันธ์ & หน้าฟร้อนท์)">น้องแพรวา (ลูกค้าสัมพันธ์ & หน้าฟร้อนท์)</option>
                <option value="ผู้จัดการทั่วไป & ฝ่ายขาย">ผู้จัดการทั่วไป & ฝ่ายขาย</option>
                <option value="หัวหน้างานจัดเลี้ยง F&B">หัวหน้างานจัดเลี้ยง F&B</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                สถานะการนัดหมาย
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                className="w-full px-3 py-2 rounded-xl border border-[#D5E2D2] text-xs bg-white"
              >
                <option value="scheduled">🟢 นัดหมายแล้ว (Scheduled)</option>
                <option value="completed">✅ พบเสร็จสิ้น (Completed)</option>
                <option value="rescheduled">🟡 เลื่อนวันนัด (Rescheduled)</option>
                <option value="cancelled">🔴 ยกเลิกนัด (Cancelled)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[#305340] mb-1">
              บันทึกสิ่งที่ต้องเตรียม / รายละเอียดเพิ่มเติม
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น เตรียมของที่ระลึกชะลอมผลไม้, แฟ้มเสนอราคาแพ็กเกจ 200.-/ท่าน, น้ำกระเจี๊ยบต้อนรับ..."
              className="w-full px-3.5 py-2 rounded-xl border border-[#D5E2D2] text-xs focus:border-[#2D5A43]"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-[#E3ECE1] flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#5B7967] hover:bg-[#F2F6F1]"
            >
              ยกเลิก
            </button>
            {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
            <button
              disabled={isSaving}
              type="submit"
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#1B3E2D] hover:bg-[#25503B] text-white shadow-md flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editAppointment ? 'บันทึกการแก้ไข' : 'บันทึกนัดหมายลงปฏิทิน'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
