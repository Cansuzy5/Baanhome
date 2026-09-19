import React, { useState } from 'react';
import { X, Building2, Phone, Mail, User, Tag, Calendar, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { B2BLead } from '../types';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead: B2BLead, scheduleAppointment?: { date: string; time: string; title: string; location: string }) => void;
  editLead?: B2BLead | null;
}

const ORG_TYPES = [
  'หน่วยงานราชการ / สำนักงานจังหวัด',
  'สถาบันการศึกษา / มหาวิทยาลัย / วิทยาลัย',
  'โรงพยาบาล / สาธารณสุข',
  'รัฐวิสาหกิจ (กฟภ., ประปา, ธ.ก.ส., ออมสิน)',
  'ภาคเอกชน / หอการค้า / สภาอุตสาหกรรม',
  'องค์กรปกครองส่วนท้องถิ่น (อบจ., เทศบาล, อบต.)',
  'สมาคม / มูลนิธิ / ชมรม',
  'ศูนย์ประสานงานพิเศษ / อื่นๆ',
];

const PIPELINE_STAGES = [
  'ยังไม่ติดต่อ',
  'ติดต่อแล้ว',
  'นัดเข้าพบ',
  'ส่งใบเสนอราคาแล้ว',
  'ตกลง Partnership',
  'ปิดการขายแล้ว',
];

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editLead,
}) => {
  const [name, setName] = useState(editLead?.name || '');
  const [priority, setPriority] = useState<'A' | 'B' | 'C'>(editLead?.priority || 'A');
  const [orgType, setOrgType] = useState(editLead?.orgType || editLead?.categoryType || ORG_TYPES[0]);
  const [contactPerson, setContactPerson] = useState(editLead?.contactPerson || '');
  const [phone, setPhone] = useState(editLead?.phone || '');
  const [email, setEmail] = useState(editLead?.email || '');
  const [offer, setOffer] = useState(editLead?.offer || editLead?.proposalOffer || '');
  const [format, setFormat] = useState(editLead?.format || editLead?.opportunity || '');
  const [pipelineStage, setPipelineStage] = useState(
    editLead?.pipelineStage || editLead?.contactStatus || 'ยังไม่ติดต่อ'
  );
  const [reasonsToApproach, setReasonsToApproach] = useState(editLead?.reasonsToApproach || '');
  const [nextAction, setNextAction] = useState(editLead?.nextAction || '');
  const [notes, setNotes] = useState(editLead?.notes || '');

  // Quick schedule appointment switch
  const [alsoSchedule, setAlsoSchedule] = useState(false);
  const [aptDate, setAptDate] = useState(editLead?.appointmentDate || '2026-09-10');
  const [aptTime, setAptTime] = useState(editLead?.appointmentTime || '10:00');
  const [aptLocation, setAptLocation] = useState('บ้านโฮม สวนอาหาร&รีสอร์ท (ห้อง VIP 1)');
  const [aptTitle, setAptTitle] = useState('นัดเข้าพบนำเสนอแพ็กเกจห้องประชุม & ชิมอาหาร');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const leadId = editLead?.id || `KH-${Math.floor(200 + Math.random() * 800)}`;
    const newLead: B2BLead = {
      ...(editLead || {}),
      id: leadId,
      name: name.trim(),
      priority,
      orgType,
      categoryType: orgType,
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim(),
      offer: offer.trim() || 'Corporate Rate & ห้องประชุม VIP พร้อมอาหารกลางวัน',
      proposalOffer: offer.trim() || 'Corporate Rate & ห้องประชุม VIP พร้อมอาหารกลางวัน',
      format: format.trim() || 'อบรมสัมมนา / ประชุมประจำเดือน (20-40 ท่าน)',
      opportunity: format.trim() || 'อบรมสัมมนา / ประชุมประจำเดือน (20-40 ท่าน)',
      pipelineStage,
      contactStatus: pipelineStage,
      reasonsToApproach: reasonsToApproach.trim(),
      nextAction: nextAction.trim(),
      notes: notes.trim(),
      appointmentDate: alsoSchedule ? aptDate : editLead?.appointmentDate,
      appointmentTime: alsoSchedule ? aptTime : editLead?.appointmentTime,
      isCustom: true,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    const appointmentPayload = alsoSchedule
      ? {
          date: aptDate,
          time: aptTime,
          title: aptTitle,
          location: aptLocation,
        }
      : undefined;

    onSave(newLead, appointmentPayload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden border border-[#E3ECE1] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1B3E2D] to-[#2D5A43] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#E6F4EA]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {editLead ? 'แก้ไขข้อมูลศูนย์ประสานงาน / หน่วยงาน' : 'เพิ่มศูนย์ประสานงาน / หน่วยงาน B2B ใหม่'}
              </h2>
              <p className="text-xs text-[#C5E1D0]">
                บันทึกลงในระบบ B2B Pipeline ของบ้านโฮม พร้อมเชื่อมโยงการนัดหมาย
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 transition-colors text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-sm text-[#1B3E2D]">
          {/* Organization Name & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#305340] mb-1">
                ชื่อศูนย์ประสานงาน / หน่วยงาน <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น ศูนย์ส่งเสริมอุตสาหกรรมภาค, สภาทนายความกาฬสินธุ์"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D2] focus:border-[#2D5A43] focus:ring-2 focus:ring-[#2D5A43]/20 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                ระดับความสำคัญ (Priority)
              </label>
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                {(['A', 'B', 'C'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      priority === p
                        ? p === 'A'
                          ? 'bg-red-600 text-white border-red-600 shadow-sm'
                          : p === 'B'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                        : 'bg-[#F7FAF6] text-[#557361] border-[#DCE8DA] hover:bg-[#EEF5EC]'
                    }`}
                  >
                    Rank {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Org Type & Pipeline Stage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                ประเภทหน่วยงาน / สังกัด
              </label>
              <select
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D2] focus:border-[#2D5A43] focus:ring-2 focus:ring-[#2D5A43]/20 text-xs sm:text-sm bg-white"
              >
                {ORG_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                สถานะการเข้าพบ / Pipeline
              </label>
              <select
                value={pipelineStage}
                onChange={(e) => setPipelineStage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D2] focus:border-[#2D5A43] focus:ring-2 focus:ring-[#2D5A43]/20 text-xs sm:text-sm bg-white"
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Person, Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                ผู้ประสานงาน / ตำแหน่ง
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-[#7B9986]" />
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="เช่น คุณวิภาวรรณ (หน.ธุรการ)"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D5E2D2] focus:border-[#2D5A43] text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                เบอร์โทรศัพท์ติดต่อ
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-[#7B9986]" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="043-xxx-xxx หรือ 08x-xxx"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D5E2D2] focus:border-[#2D5A43] text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                อีเมล / LINE ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-[#7B9986]" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@org.go.th"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D5E2D2] focus:border-[#2D5A43] text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Tailored Offer & Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                ข้อเสนอที่ควรชู (Tailored Offer)
              </label>
              <input
                type="text"
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                placeholder="เช่น Corporate Rate 15%, ฟรีห้องจัดเบรก VIP"
                className="w-full px-3.5 py-2 rounded-xl border border-[#D5E2D2] focus:border-[#2D5A43] text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                รูปแบบการจัดงาน / โอกาส (Format)
              </label>
              <input
                type="text"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder="เช่น อบรมบุคลากรประจำปี 30-40 คน"
                className="w-full px-3.5 py-2 rounded-xl border border-[#D5E2D2] focus:border-[#2D5A43] text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Next Action & Reasons to approach */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                เหตุผลที่ควรเข้าหา (Reasons to Approach)
              </label>
              <textarea
                rows={2}
                value={reasonsToApproach}
                onChange={(e) => setReasonsToApproach(e.target.value)}
                placeholder="มีงบอบรมสัมมนาสม่ำเสมอ ต้องการห้องประชุมส่วนตัวใกล้เมือง..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#D5E2D2] focus:border-[#2D5A43] text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#305340] mb-1">
                แผนดำเนินการถัดไป (Next Action)
              </label>
              <textarea
                rows={2}
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="โทรนัดหมายหัวหน้าฝ่ายแผนงานเพื่อส่งแคตตาล็อก..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#D5E2D2] focus:border-[#2D5A43] text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Appointment Scheduling Option */}
          <div className="bg-[#F4F9F2] p-4 rounded-2xl border border-[#D8E8D5] space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs sm:text-sm text-[#1B3E2D]">
              <input
                type="checkbox"
                checked={alsoSchedule}
                onChange={(e) => setAlsoSchedule(e.target.checked)}
                className="w-4 h-4 rounded text-[#2D5A43] focus:ring-[#2D5A43]"
              />
              <span>📅 บันทึกนัดหมายเข้าพบลงในปฏิทิน (Schedule Appointment)</span>
            </label>

            {alsoSchedule && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E1EDE0]">
                <div>
                  <label className="block text-[11px] font-bold text-[#3C644E] mb-1">
                    วันที่นัดหมาย
                  </label>
                  <input
                    type="date"
                    value={aptDate}
                    onChange={(e) => setAptDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#CFDFCC] text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#3C644E] mb-1">
                    เวลานัดหมาย
                  </label>
                  <input
                    type="time"
                    value={aptTime}
                    onChange={(e) => setAptTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#CFDFCC] text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#3C644E] mb-1">
                    สถานที่นัดพบ
                  </label>
                  <input
                    type="text"
                    value={aptLocation}
                    onChange={(e) => setAptLocation(e.target.value)}
                    placeholder="ห้อง VIP 1 บ้านโฮม / สำนักงานลูกค้า"
                    className="w-full px-3 py-1.5 rounded-xl border border-[#CFDFCC] text-xs bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-[#E3ECE1] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#5B7967] hover:bg-[#F2F6F1] transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#1B3E2D] hover:bg-[#25503B] text-white shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editLead ? 'บันทึกการแก้ไข' : 'บันทึกหน่วยงานใหม่'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
