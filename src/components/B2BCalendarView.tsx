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
import { B2BAppointment, B2BLead, AppointmentStatus } from '../types';
import { exportAppointmentsToCsv } from '../utils/b2bExport';

interface B2BCalendarViewProps {
  appointments: B2BAppointment[];
  leads: B2BLead[];
  onAddAppointment: (date?: string) => void;
  onEditAppointment: (appointment: B2BAppointment) => void;
  onDeleteAppointment: (appointmentId: string) => void;
  onUpdateStatus: (appointmentId: string, status: AppointmentStatus) => void;
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
  onUpdateStatus,
  onSelectLeadForSearch,
}) => {
  // Current view year & month - default to September 2026 based on metadata
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [filterStatus, setFilterStatus] = useState<string>('all');

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
    setSelectedDateStr(today.toISOString().slice(0, 10));
  };

  // Calendar Grid Calculation
  const { calendarDays, appointmentsByDate } = useMemo(() => {
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
        isToday: dateStr === new Date().toISOString().slice(0, 10),
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        date: i,
        monthType: 'current',
        dateStr,
        isToday: dateStr === new Date().toISOString().slice(0, 10),
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
        isToday: dateStr === new Date().toISOString().slice(0, 10),
      });
    }

    // Map appointments by date
    const apptMap: Record<string, B2BAppointment[]> = {};
    appointments.forEach((apt) => {
      if (!apptMap[apt.date]) {
        apptMap[apt.date] = [];
      }
      apptMap[apt.date].push(apt);
    });

    return { calendarDays: days, appointmentsByDate: apptMap };
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
      .filter((apt) => {
        if (filterStatus === 'all') return true;
        return apt.status === filterStatus;
      })
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [appointments, filterStatus]);

  // Monthly stats
  const stats = useMemo(() => {
    const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const thisMonthApts = appointments.filter((a) => a.date.startsWith(currentMonthPrefix));
    const completed = thisMonthApts.filter((a) => a.status === 'completed').length;
    const upcoming = thisMonthApts.filter((a) => a.status === 'scheduled').length;
    const notMet = thisMonthApts.filter((a) => a.status === 'not_met').length;
    const rescheduled = thisMonthApts.filter((a) => a.status === 'rescheduled').length;
    const cancelled = thisMonthApts.filter((a) => a.status === 'cancelled').length;
    const outcomeBase = completed + notMet;
    const successRate = outcomeBase > 0 ? Math.round((completed / outcomeBase) * 100) : 0;
    return {
      totalThisMonth: thisMonthApts.length,
      completed,
      upcoming,
      notMet,
      rescheduled,
      cancelled,
      successRate,
    };
  }, [appointments, year, month]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Stats */}
      <div className="bg-gradient-to-r from-[#173827] via-[#24523B] to-[#1E4330] rounded-3xl p-5 sm:p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8FD6A9] mb-1">
            <CalendarCheck className="w-4 h-4" />
            <span>ระบบนัดหมาย & กำหนดการเข้าพบ B2B CORPORATE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">
            ปฏิทินนัดหมายเข้าพบ & Site Visit
          </h2>
          <p className="text-xs sm:text-sm text-[#C4E2CF] mt-1 max-w-xl leading-relaxed">
            ติดตามคิวนำเสนอแพ็กเกจห้องประชุม ชิมอาหารว่าง และนัดหมายเซ็นสัญญาคู่ค้าองค์กรทั่วกาฬสินธุ์
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 text-center border border-white/15">
            <span className="text-[10px] text-[#A7D7B9] block">นัดหมายเดือนนี้</span>
            <span className="text-lg font-bold text-white">{stats.totalThisMonth} ครั้ง</span>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 text-center border border-white/15">
            <span className="text-[10px] text-[#A7D7B9] block">พบลูกค้าแล้ว</span>
            <span className="text-lg font-bold text-[#A3E635]">{stats.completed} นัด</span>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 text-center border border-white/15">
            <span className="text-[10px] text-[#A7D7B9] block">ไม่ได้เข้าพบ</span>
            <span className="text-lg font-bold text-[#FF9D9D]">{stats.notMet} นัด</span>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 text-center border border-white/15">
            <span className="text-[10px] text-[#A7D7B9] block">อัตราเข้าพบสำเร็จ</span>
            <span className="text-lg font-bold text-[#FDE68A]">{stats.successRate}%</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportAppointmentsToCsv(appointments)}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/20"
              title="ส่งออกตารางนัดหมายเป็น CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export นัดหมาย</span>
            </button>
            <button
              onClick={() => onAddAppointment(selectedDateStr)}
              className="px-4 py-2 rounded-xl bg-[#C89B3C] hover:bg-[#B3872E] text-[#1E3A29] text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มนัดหมาย</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Calendar on Left, Selected Day & Agenda on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Section (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-[#E3ECE1] shadow-sm flex flex-col">
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
              const hasApts = dayAppointments.length > 0;
              const isSelected = item.dateStr === selectedDateStr;

              return (
                <button
                  key={`${item.dateStr}-${idx}`}
                  onClick={() => {
                    setSelectedDateStr(item.dateStr);
                    if (!hasApts) onAddAppointment(item.dateStr);
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

                    {hasApts && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#1B3E2D] text-white">
                        {dayAppointments.length}
                      </span>
                    )}
                  </div>

                  {/* Tiny appointment preview pills */}
                  <div className="space-y-1 mt-1 w-full overflow-hidden">
                    {dayAppointments.slice(0, 2).map((apt) => (
                      <div
                        key={apt.id}
                        className={`text-[9px] px-1 py-0.5 rounded truncate font-medium ${
                          apt.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : apt.status === 'not_met' || apt.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800'
                            : apt.status === 'rescheduled'
                            ? 'bg-amber-100 text-amber-800'
                            : apt.priority === 'A'
                            ? 'bg-red-50 text-red-700 border-l-2 border-red-500'
                            : 'bg-amber-50 text-amber-800 border-l-2 border-amber-500'
                        }`}
                        title={`${apt.time} - ${apt.leadName}`}
                      >
                        {apt.time} {apt.leadName.replace('สำนักงาน', 'สนง.').slice(0, 10)}...
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-[9px] text-[#7B9786] font-bold">
                        +{dayAppointments.length - 2} รายการ
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Date Summary */}
          <div className="mt-4 pt-3 border-t border-[#EEF4ED] flex items-center justify-between text-xs text-[#5D7B69]">
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
        <div className="lg:col-span-5 space-y-4">
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

                    {/* Status quick toggle */}
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-[#809B8B]">สถานะ:</span>
                      <select
                        value={apt.status}
                        onChange={(e) =>
                          onUpdateStatus(apt.id, e.target.value as AppointmentStatus)
                        }
                        className="text-[11px] px-2 py-0.5 rounded-lg border border-[#D5E2D2] bg-[#FAFBF9] text-[#1B3E2D] font-semibold"
                      >
                        <option value="scheduled">🟢 รอเข้าพบ</option>
                        <option value="completed">✅ พบแล้ว</option>
                        <option value="not_met">🔴 ไม่ได้เข้าพบ</option>
                        <option value="rescheduled">🟡 เลื่อนนัด</option>
                        <option value="cancelled">⚫ ยกเลิกนัด</option>
                      </select>
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
                <option value="scheduled">🟢 รอเข้าพบ</option>
                <option value="completed">✅ พบแล้ว</option>
                <option value="not_met">🔴 ไม่ได้เข้าพบ</option>
                <option value="rescheduled">🟡 เลื่อนนัด</option>
                <option value="cancelled">⚫ ยกเลิกนัด</option>
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
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          apt.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : apt.status === 'not_met'
                            ? 'bg-rose-100 text-rose-800'
                            : apt.status === 'rescheduled'
                            ? 'bg-amber-100 text-amber-800'
                            : apt.status === 'cancelled'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {apt.status === 'completed'
                          ? 'พบแล้ว'
                          : apt.status === 'not_met'
                          ? 'ไม่ได้เข้าพบ'
                          : apt.status === 'rescheduled'
                          ? 'เลื่อนนัด'
                          : apt.status === 'cancelled'
                          ? 'ยกเลิกนัด'
                          : 'รอเข้าพบ'}
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
