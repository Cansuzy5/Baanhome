import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Download,
  CalendarCheck,
  Building2,
  Edit2,
  Trash2,
  Filter,
} from 'lucide-react';
import { B2BAppointment, B2BLead, B2BPipelineStatus } from '../types';
import { exportAppointmentsToCsv } from '../utils/b2bExport';
import { PIPELINE_STAGES } from '../data/b2bPartnerships';
import { localDateKey } from '../utils/dateUtils';

interface B2BCalendarViewProps {
  appointments: B2BAppointment[];
  leads: B2BLead[];
  onAddAppointment: (date?: string) => void;
  onEditAppointment: (appointment: B2BAppointment) => void;
  onDeleteAppointment: (appointmentId: string) => void;
  onUpdateLeadStage: (leadId: string, stage: B2BPipelineStatus | string) => void;
  onSelectLeadForSearch?: (leadName: string) => void;
}

const MONTH_NAMES_TH = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const DAYS_SHORT_TH = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export const B2BCalendarView: React.FC<B2BCalendarViewProps> = ({
  appointments,
  leads,
  onAddAppointment,
  onEditAppointment,
  onDeleteAppointment,
  onUpdateLeadStage,
  onSelectLeadForSearch,
}) => {
  // Current view year & month - default to September 2026 based on metadata
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => localDateKey());
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const getLeadForAppointment = (apt: B2BAppointment) =>
    leads.find((lead) => (apt.leadId && lead.id === apt.leadId) || lead.name === apt.leadName);

  const getLeadStage = (apt: B2BAppointment) => {
    const lead = getLeadForAppointment(apt);
    const raw = lead?.pipelineStage || lead?.contactStatus || 'ยังไม่ติดต่อ';
    return raw === 'เข้าพบแล้ว' ? 'ติดตามต่อ' : raw;
  };

  const stageClass = (stage: string) => {
    if (stage === 'ปิดการขาย') return 'bg-emerald-100 text-emerald-800';
    if (stage === 'ตกลง Partnership') return 'bg-teal-100 text-teal-800';
    if (stage === 'ส่งใบเสนอราคาแล้ว') return 'bg-amber-100 text-amber-800';
    if (stage === 'ติดตามต่อ') return 'bg-violet-100 text-violet-800';
    if (stage === 'นัดเข้าพบ') return 'bg-blue-100 text-blue-800';
    if (stage === 'ติดต่อแล้ว') return 'bg-lime-100 text-lime-800';
    return 'bg-slate-100 text-slate-700';
  };

  const appointmentClass = (apt: B2BAppointment) => {
    if (apt.status === 'completed') return 'bg-emerald-100 text-emerald-800 border-l-2 border-emerald-500';
    if (apt.status === 'cancelled') return 'bg-slate-100 text-slate-600 border-l-2 border-slate-400';
    return 'bg-blue-100 text-blue-800 border-l-2 border-blue-500';
  };

  const appointmentLabel = (apt: B2BAppointment) =>
    apt.status === 'completed' ? 'เข้าพบแล้ว' : apt.status === 'cancelled' ? 'ยกเลิกนัด' : 'นัดเข้าพบ';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(localDateKey(today));
  };

  // Calendar Grid Calculation
  const { calendarDays, appointmentsByDate, movedAppointmentsByDate } = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      date: number;
      monthType: 'prev' | 'current' | 'next';
      dateStr: string;
      isToday: boolean;
    }> = [];

    // Prev month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = totalDaysInPrevMonth - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        date: d,
        monthType: 'prev',
        dateStr,
        isToday: dateStr === localDateKey(),
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        date: i,
        monthType: 'current',
        dateStr,
        isToday: dateStr === localDateKey(),
      });
    }

    // Next month padding
    const remaining = 42 - days.length; // 6 rows * 7 cols
    for (let i = 1; i <= remaining; i++) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        date: i,
        monthType: 'next',
        dateStr,
        isToday: dateStr === localDateKey(),
      });
    }

    // Current appointments plus non-destructive reschedule traces.
    const apptMap: Record<string, B2BAppointment[]> = {};
    const movedMap: Record<string, Array<{ appointmentId: string; leadName: string; fromTime: string; toDate: string; toTime: string }>> = {};
    appointments.forEach((apt) => {
      if (!apptMap[apt.date]) apptMap[apt.date] = [];
      apptMap[apt.date].push(apt);

      (apt.rescheduleHistory || []).forEach((move) => {
        if (!movedMap[move.fromDate]) movedMap[move.fromDate] = [];
        movedMap[move.fromDate].push({
          appointmentId: apt.id,
          leadName: apt.leadName,
          fromTime: move.fromTime,
          toDate: move.toDate,
          toTime: move.toTime,
        });
      });
    });

    return { calendarDays: days, appointmentsByDate: apptMap, movedAppointmentsByDate: movedMap };
  }, [year, month, appointments]);

  // Appointments on selected date
  const selectedDateAppointments = useMemo(() => {
    return (appointmentsByDate[selectedDateStr] || []).sort((a, b) =>
      a.time.localeCompare(b.time)
    );
  }, [appointmentsByDate, selectedDateStr]);

  // All upcoming appointments filtered
  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((apt) => filterStatus === 'all' || getLeadStage(apt) === filterStatus)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [appointments, leads, filterStatus]);

  // Pipeline stats use the same organization status across directory and calendar.
  const stats = useMemo(() => {
    const stageOf = (lead: B2BLead) => lead.pipelineStage || lead.contactStatus || 'ยังไม่ติดต่อ';
    return {
      totalThisMonth: appointments.filter((a) => a.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length,
      contacted: leads.filter((l) => stageOf(l) === 'ติดต่อแล้ว').length,
      meeting: leads.filter((l) => stageOf(l) === 'นัดเข้าพบ').length,
      quoted: leads.filter((l) => stageOf(l) === 'ส่งใบเสนอราคาแล้ว').length,
      closed: leads.filter((l) => stageOf(l) === 'ปิดการขาย').length,
    };
  }, [appointments, leads, year, month]);

  return (
    <div className="space-y-3">
      {/* Compact calendar controls: keep the calendar visible in the first viewport */}
      <div className="bg-white rounded-2xl border border-[#DDE7DC] shadow-sm p-3 sm:p-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#2D5A43]">
              <CalendarCheck className="w-4 h-4" />
              <span>ปฏิทินนัดหมายเข้าพบ</span>
            </div>
            <p className="text-[11px] text-[#789084] mt-0.5">กดวันว่างเพื่อลงนัด หรือกดนัดเดิมเพื่อดูรายละเอียดและบันทึกผล</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-[#F3F7F1] border border-[#E0E8DD] text-center">
              <span className="text-[9px] text-[#789084] block">เดือนนี้</span>
              <span className="text-sm font-bold text-[#173827]">{stats.totalThisMonth}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
              <span className="text-[9px] text-emerald-700 block">ติดต่อแล้ว</span>
              <span className="text-sm font-bold text-emerald-700">{stats.contacted}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-100 text-center">
              <span className="text-[9px] text-blue-700 block">นัดเข้าพบ</span>
              <span className="text-sm font-bold text-blue-700">{stats.meeting}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100 text-center">
              <span className="text-[9px] text-amber-700 block">ส่งใบเสนอราคา</span>
              <span className="text-sm font-bold text-amber-700">{stats.quoted}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-100 text-center">
              <span className="text-[9px] text-teal-700 block">ปิดการขาย</span>
              <span className="text-sm font-bold text-teal-700">{stats.closed}</span>
            </div>

            <button
              onClick={() => exportAppointmentsToCsv(appointments)}
              className="px-3 py-2 rounded-xl border border-[#D9E3D7] text-[#496655] text-xs font-bold flex items-center gap-1.5 hover:bg-[#F6F9F5]"
              title="ส่งออกตารางนัดหมายเป็น CSV"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button
              onClick={() => onAddAppointment(selectedDateStr)}
              className="px-3.5 py-2 rounded-xl bg-[#C89B3C] hover:bg-[#B3872E] text-[#1E3A29] text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> เพิ่มนัดหมาย
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Calendar on Left, Selected Day & Agenda on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Calendar Section (7 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-4 sm:p-5 border border-[#E3ECE1] shadow-sm flex flex-col">
          {/* Calendar Header Navigation */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#EEF4ED]">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#2D5A43]" />
              <h3 className="font-bold text-base sm:text-lg text-[#1B3E2D]">
                {MONTH_NAMES_TH[month]} {year + 543}
              </h3>
              <span className="text-xs text-[#7A9986] hidden sm:inline">
                ({new Date(year, month).toLocaleString('en-US', { month: 'long', year: 'numeric' })})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleJumpToToday}
                className="px-3 py-1 rounded-xl text-xs font-bold text-[#2D5A43] hover:bg-[#EEF5EC] border border-[#D6E6D3] transition-colors"
              >
                วันนี้
              </button>
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl hover:bg-[#F0F5EE] text-[#446552] transition-colors"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl hover:bg-[#F0F5EE] text-[#446552] transition-colors"
                title="เดือนถัดไป"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {DAYS_SHORT_TH.map((d, i) => (
              <div
                key={d}
                className={`py-1.5 text-xs font-bold ${
                  i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-600' : 'text-[#567563]'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1.5 flex-1">
            {calendarDays.map((item, idx) => {
              const dayAppointments = appointmentsByDate[item.dateStr] || [];
              const movedAppointments = movedAppointmentsByDate[item.dateStr] || [];
              const hasApts = dayAppointments.length > 0;
              const hasEntries = hasApts || movedAppointments.length > 0;
              const isSelected = item.dateStr === selectedDateStr;

              return (
                <button
                  key={`${item.dateStr}-${idx}`}
                  onClick={() => {
                    setSelectedDateStr(item.dateStr);
                    if (!hasEntries) onAddAppointment(item.dateStr);
                  }}
                  className={`min-h-[64px] sm:min-h-[74px] p-1.5 rounded-2xl flex flex-col justify-between text-left transition-all border relative ${
                    item.monthType !== 'current'
                      ? 'bg-[#FBFDFB] text-gray-300 border-transparent hover:border-[#E2ECE0]'
                      : isSelected
                      ? 'bg-[#EEF6EB] border-[#2D5A43] shadow-sm ring-2 ring-[#2D5A43]/20'
                      : 'bg-white hover:bg-[#F9FCF8] border-[#E8EFE6]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                        item.isToday
                          ? 'bg-[#2D5A43] text-white'
                          : isSelected
                          ? 'text-[#1B3E2D]'
                          : item.monthType === 'current'
                          ? 'text-[#2D4536]'
                          : 'text-gray-400'
                      }`}
                    >
                      {item.date}
                    </span>

                    {hasEntries && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#1B3E2D] text-white">
                        {dayAppointments.length + movedAppointments.length}
                      </span>
                    )}
                  </div>

                  {/* Tiny appointment preview pills */}
                  <div className="space-y-1 mt-1 w-full overflow-hidden">
                    {dayAppointments.slice(0, 2).map((apt) => (
                      <div
                        key={apt.id}
                        className={`text-[9px] px-1 py-0.5 rounded truncate font-medium ${appointmentClass(apt)}`}
                        title={`${apt.time} - ${apt.leadName} - ${appointmentLabel(apt)}`}
                      >
                        {apt.time} {appointmentLabel(apt)} · {apt.leadName.replace('สำนักงาน', 'สนง.').slice(0, 8)}
                      </div>
                    ))}
                    {dayAppointments.length < 2 && movedAppointments.slice(0, 2 - dayAppointments.length).map((move) => (
                      <div
                        key={`${move.appointmentId}-${move.fromTime}-${move.toDate}`}
                        className="text-[9px] px-1 py-0.5 rounded truncate font-medium bg-slate-100 text-slate-500 border-l-2 border-slate-400"
                        title={`เลื่อนจากวันนี้ไป ${move.toDate} ${move.toTime}`}
                      >
                        {move.fromTime} เลื่อนแล้ว → {move.toDate.slice(5)}
                      </div>
                    ))}
                    {dayAppointments.length + movedAppointments.length > 2 && (
                      <div className="text-[9px] text-[#7B9786] font-bold">
                        +{dayAppointments.length + movedAppointments.length - 2} รายการ
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-[#6D8276]">
            <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full bg-blue-500" /> นัดเข้าพบ</span>
            <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> เข้าพบแล้ว</span>
            <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full bg-slate-400" /> เลื่อนแล้ว / ยกเลิก</span>
          </div>

          {/* Quick Date Summary */}
          <div className="mt-3 pt-3 border-t border-[#EEF4ED] flex items-center justify-between text-xs text-[#5D7B69]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2D5A43] inline-block" />
              <span>วันที่เลือก: <strong>{selectedDateStr}</strong></span>
            </div>
            <button
              onClick={() => onAddAppointment(selectedDateStr)}
              className="text-[#2D5A43] hover:underline font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ เพิ่มนัดในวันที่เลือก</span>
            </button>
          </div>
        </div>

        {/* Right Section: Day Schedule & Upcoming Agenda (5 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Selected Date Focus Card */}
          <div className="bg-[#FAFBF9] rounded-3xl p-5 border border-[#E3ECE1] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[11px] font-bold text-[#71917E] block">
                  กำหนดการประจำวันที่เลือก
                </span>
                <h4 className="text-base font-bold text-[#183A28]">
                  {selectedDateStr} ({selectedDateAppointments.length} นัดหมาย)
                </h4>
              </div>
              <button
                onClick={() => onAddAppointment(selectedDateStr)}
                className="px-3 py-1.5 rounded-xl bg-[#2D5A43] hover:bg-[#204533] text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มนัด</span>
              </button>
            </div>

            {selectedDateAppointments.length === 0 ? (
              <div className="py-6 text-center text-[#829D8E] bg-white rounded-2xl border border-dashed border-[#D6E3D3]">
                <CalendarIcon className="w-8 h-8 mx-auto text-[#BDD3C5] mb-2" />
                <p className="text-xs font-medium">ยังไม่มีนัดหมายในวันที่นี้</p>
                <button
                  onClick={() => onAddAppointment(selectedDateStr)}
                  className="mt-2 text-xs font-bold text-[#2D5A43] hover:underline"
                >
                  + คลิกเพื่อลงตารางนัดหมาย
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {selectedDateAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    onClick={() => onEditAppointment(apt)}
                    className="p-3.5 rounded-2xl bg-white border border-[#DEE9DC] hover:border-[#2D5A43] transition-all space-y-2 shadow-xs cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#EEF5EC] text-[#24523B]">
                          ⏰ {apt.time} น.
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                            apt.priority === 'A'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          Rank {apt.priority || 'A'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditAppointment(apt);
                          }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-[#597866] cursor-pointer transition-colors"
                          title="แก้ไขนัดหมาย"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAppointment(apt.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 cursor-pointer transition-colors"
                          title="ลบนัดหมาย"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h5 className="font-bold text-xs sm:text-sm text-[#1B3E2D]">
                      {apt.leadName}
                    </h5>
                    <p className="text-xs text-[#527260] line-clamp-2">
                      📌 {apt.title}
                    </p>

                    <div className="text-[11px] text-[#698675] space-y-0.5 pt-1 border-t border-[#EEF4ED]">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-[#7B9786] shrink-0" />
                        <span className="truncate">{apt.location}</span>
                      </div>
                      {apt.contactPerson && (
                        <div className="flex items-center gap-1 truncate">
                          <User className="w-3 h-3 text-[#7B9786] shrink-0" />
                          <span>{apt.contactPerson}</span>
                          {apt.phone && (
                            <a
                              href={`tel:${apt.phone}`}
                              className="text-[#1E7438] font-semibold hover:underline ml-1"
                            >
                              📞 {apt.phone}
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-1 space-y-2 text-[11px]" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-bold px-2 py-1 rounded-full ${appointmentClass(apt)}`}>{appointmentLabel(apt)}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onEditAppointment(apt); }}
                          className="px-2.5 py-1 rounded-lg bg-[#1B3E2D] text-white font-bold"
                        >
                          จัดการนัด
                        </button>
                      </div>
                      {(() => {
                        const lead = getLeadForAppointment(apt);
                        const stage = getLeadStage(apt);
                        return lead ? (
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#EEF4ED]">
                            <span className="text-[#72877B] font-semibold">สถานะติดตาม:</span>
                            <select
                              value={stage}
                              onChange={(e) => onUpdateLeadStage(lead.id, e.target.value)}
                              className={`max-w-[190px] px-2 py-1 rounded-lg border border-[#D5E2D2] font-bold ${stageClass(stage)}`}
                            >
                              {!PIPELINE_STAGES.some((item) => item.stage === stage) && (
                                <option value={stage}>{stage} (ข้อมูลเดิม)</option>
                              )}
                              {(apt.status === 'completed'
                                ? PIPELINE_STAGES.filter((item) => ['ติดตามต่อ','ส่งใบเสนอราคาแล้ว','ตกลง Partnership','ปิดการขาย','ปิดการขายไม่สำเร็จ'].includes(item.stage))
                                : PIPELINE_STAGES
                              ).map((item) => (
                                <option key={item.stage} value={item.stage}>{item.stage}</option>
                              ))}
                            </select>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All Appointments Timeline Card */}
          <div className="bg-white rounded-3xl p-5 border border-[#E3ECE1] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-[#1B3E2D] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#2D5A43]" />
                <span>กำหนดการทั้งหมด ({filteredAppointments.length})</span>
              </h4>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs px-2.5 py-1 rounded-xl border border-[#D5E2D2] bg-[#FAFBF9] text-[#345945]"
              >
                <option value="all">ทุกสถานะ</option>
                {PIPELINE_STAGES.map((item) => <option key={item.stage} value={item.stage}>{item.stage}</option>)}
              </select>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {filteredAppointments.map((apt) => (
                <div
                  key={apt.id}
                  onClick={() => {
                    setSelectedDateStr(apt.date);
                    onEditAppointment(apt);
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer text-xs ${
                    apt.date === selectedDateStr
                      ? 'border-[#2D5A43] bg-[#F4F9F2]'
                      : 'border-[#E6EFE4] hover:bg-[#F9FCF8]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#1E4330]">
                      📅 {apt.date} | ⏰ {apt.time} น.
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${appointmentClass(apt)}`}>
                        {appointmentLabel(apt)}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stageClass(getLeadStage(apt))}`}>
                        {getLeadStage(apt)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAppointment(apt);
                        }}
                        className="p-1 rounded-md hover:bg-gray-200 text-[#597866] cursor-pointer"
                        title="แก้ไขนัดหมาย"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAppointment(apt.id);
                        }}
                        className="p-1 rounded-md hover:bg-red-100 text-red-500 cursor-pointer"
                        title="ลบนัดหมาย"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <h6 className="font-bold text-[#1B3E2D] truncate">
                    {apt.leadName}
                  </h6>
                  <p className="text-[11px] text-[#5A7967] truncate">
                    {apt.title}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-[#7E9989] mt-1.5 pt-1 border-t border-[#EEF4ED]">
                    <span>📍 {apt.location.slice(0, 24)}...</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
