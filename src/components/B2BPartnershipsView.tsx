import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Building,
  Target,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Award,
  ChevronRight,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Calendar,
  Plus,
  Download,
  Edit2,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { B2BLead, B2BAppointment, AppointmentStatus, StaffProfile, UserRole } from '../types';
import {
  B2B_LEADS,
  PARTNERSHIP_PIPELINE_STATS,
  PIPELINE_STAGES,
  TOP_RECOMMENDED_TARGETS,
} from '../data/b2bPartnerships';
import { INITIAL_B2B_APPOINTMENTS } from '../data/b2bAppointments';
import { B2BCalendarView } from './B2BCalendarView';
import { AddLeadModal } from './AddLeadModal';
import { AddAppointmentModal } from './AddAppointmentModal';
import { ExportB2BModal } from './ExportB2BModal';
import { GoogleSheetsDbConfig, appendAppointmentToSheet } from '../utils/googleSheetsDatabase';
import { getGoogleAccessToken } from '../utils/googleWorkspaceAuth';
import {
  subscribeCentralB2B,
  saveCentralB2BLead,
  deleteCentralB2BLead,
  saveCentralB2BAppointment,
  deleteCentralB2BAppointment,
  resetCentralB2BToDefault,
  canUserEditOperational,
  canUserManageSystem,
  getCachedLeads,
  getCachedAppointments,
} from '../utils/b2bService';
import { getActiveSessionUser } from '../utils/authService';

interface B2BPartnershipsViewProps {
  onSelectLeadForSearch?: (leadName: string) => void;
  onOpenGoogleSheetsDbModal?: () => void;
  sheetsDbConfig?: GoogleSheetsDbConfig | null;
  currentUser?: StaffProfile | null;
}

export const B2BPartnershipsView: React.FC<B2BPartnershipsViewProps> = ({
  onSelectLeadForSearch,
  onOpenGoogleSheetsDbModal,
  sheetsDbConfig,
  currentUser,
}) => {
  const activeUser = currentUser || getActiveSessionUser();
  const currentRole: UserRole = activeUser?.role || 'Knowledge User';
  const isOperatorOrAdmin = canUserEditOperational(currentRole);
  const isAdmin = canUserManageSystem(currentRole);

  // Sub-tabs: directory list vs calendar schedule
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'calendar'>('directory');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'All' | 'A' | 'B' | 'C'>('All');
  const [selectedStage, setSelectedStage] = useState<string>('All');
  const [selectedOrgType, setSelectedOrgType] = useState<string>('All');

  // Lead Detail Modal & clipboard states
  const [activeLeadModal, setActiveLeadModal] = useState<B2BLead | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // Persistent leads and appointments from central database
  const [leadsList, setLeadsList] = useState<B2BLead[]>(getCachedLeads);
  const [appointments, setAppointments] = useState<B2BAppointment[]>(getCachedAppointments);

  // Modals state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<B2BLead | null>(null);
  const [isAddAptModalOpen, setIsAddAptModalOpen] = useState(false);
  const [editingApt, setEditingApt] = useState<B2BAppointment | null>(null);
  const [aptDefaultDate, setAptDefaultDate] = useState<string>('2026-09-09');
  const [aptDefaultLead, setAptDefaultLead] = useState<B2BLead | null>(null);

  // In-App Confirmation Modals state (avoiding window.confirm which is blocked in sandboxed iframes)
  const [appointmentToDelete, setAppointmentToDelete] = useState<B2BAppointment | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<B2BLead | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Subscribe to Central Shared B2B Database in real-time across all users
  useEffect(() => {
    const unsubscribe = subscribeCentralB2B(({ leads, appointments: apts }) => {
      setLeadsList(leads);
      setAppointments(apts);
    });
    return () => unsubscribe();
  }, []);

  // Handle Add or Edit Lead
  const handleSaveLead = async (
    lead: B2BLead,
    scheduleAppointment?: { date: string; time: string; title: string; location: string }
  ) => {
    if (!isOperatorOrAdmin) {
      setPermissionError('สิทธิ์ไม่เพียงพอ: เฉพาะ Operator และ Administrator เท่านั้นที่สามารถแก้ไขข้อมูลลูกค้า B2B ได้');
      return;
    }

    const res = await saveCentralB2BLead(lead, currentRole);
    if (!res.success) {
      setPermissionError(res.error || 'ไม่สามารถบันทึกข้อมูลได้');
      return;
    }

    if (scheduleAppointment) {
      const newApt: B2BAppointment = {
        id: `APT-${Date.now().toString().slice(-6)}`,
        leadId: lead.id,
        leadName: lead.name,
        date: scheduleAppointment.date,
        time: scheduleAppointment.time,
        title: scheduleAppointment.title,
        location: scheduleAppointment.location,
        objective: 'นำเสนอแพ็กเกจห้องประชุม & Corporate Rate',
        status: 'scheduled',
        contactPerson: lead.contactPerson,
        phone: lead.phone,
        priority: lead.priority,
        createdAt: new Date().toISOString().split('T')[0],
      };
      await saveCentralB2BAppointment(newApt, currentRole);
    }
  };

  // Handle Delete Lead (opens confirmation dialog)
  const handleDeleteLead = (leadId: string) => {
    if (!isAdmin) {
      setPermissionError('สิทธิ์ไม่เพียงพอ: เฉพาะ Administrator เท่านั้นที่สามารถลบข้อมูลลูกค้า B2B ได้');
      return;
    }
    const target = leadsList.find((l) => l.id === leadId);
    if (target) {
      setLeadToDelete(target);
    }
  };

  // Execute confirmed lead deletion
  const confirmDeleteLead = async () => {
    if (!leadToDelete) return;
    const targetId = leadToDelete.id;
    await deleteCentralB2BLead(targetId, currentRole);
    if (activeLeadModal?.id === targetId) {
      setActiveLeadModal(null);
    }
    setLeadToDelete(null);
  };

  // Handle Add or Edit Appointment
  const handleSaveAppointment = async (apt: B2BAppointment) => {
    if (!isOperatorOrAdmin) {
      setPermissionError('สิทธิ์ไม่เพียงพอ: เฉพาะ Operator และ Administrator เท่านั้นที่สามารถบันทึกนัดหมายได้');
      return;
    }

    const res = await saveCentralB2BAppointment(apt, currentRole);
    if (!res.success) {
      setPermissionError(res.error || 'ไม่สามารถบันทึกนัดหมายได้');
      return;
    }

    // Auto-sync appointment to connected Google Sheets if enabled
    if (sheetsDbConfig && sheetsDbConfig.autoSyncB2B && sheetsDbConfig.spreadsheetId) {
      getGoogleAccessToken()
        .then((token) => {
          if (token) {
            appendAppointmentToSheet(token, sheetsDbConfig.spreadsheetId, apt).catch((err) => {
              console.warn('Auto-append appointment to Google Sheets failed:', err);
            });
          }
        })
        .catch((err) => console.warn('Could not get Google access token for sync:', err));
    }

    // Sync appointment date into lead if matching
    if (apt.leadId) {
      const existingLead = leadsList.find((l) => l.id === apt.leadId);
      if (existingLead) {
        const updatedLead: B2BLead = {
          ...existingLead,
          appointmentDate: apt.date,
          appointmentTime: apt.time,
          pipelineStage: existingLead.pipelineStage === 'ยังไม่ติดต่อ' ? 'นัดเข้าพบ' : existingLead.pipelineStage,
          contactStatus: existingLead.contactStatus === 'ยังไม่ติดต่อ' ? 'นัดเข้าพบ' : existingLead.contactStatus,
        };
        await saveCentralB2BLead(updatedLead, currentRole);
      }
    }
  };

  // Handle Delete Appointment (opens confirmation dialog)
  const handleDeleteAppointment = (appointmentId: string) => {
    if (!isAdmin) {
      setPermissionError('สิทธิ์ไม่เพียงพอ: เฉพาะ Administrator เท่านั้นที่สามารถลบนัดหมายได้');
      return;
    }
    const target = appointments.find((a) => a.id === appointmentId);
    if (target) {
      setAppointmentToDelete(target);
    }
  };

  // Execute confirmed appointment deletion
  const confirmDeleteAppointment = async () => {
    if (!appointmentToDelete) return;
    const targetId = appointmentToDelete.id;
    await deleteCentralB2BAppointment(targetId, currentRole);
    setAppointmentToDelete(null);
  };

  // Handle Update Appointment Status
  const handleUpdateAppointmentStatus = async (appointmentId: string, status: AppointmentStatus) => {
    if (!isOperatorOrAdmin) {
      setPermissionError('สิทธิ์ไม่เพียงพอ: เฉพาะ Operator และ Administrator เท่านั้นที่สามารถเปลี่ยนสถานะนัดหมายได้');
      return;
    }
    const target = appointments.find((a) => a.id === appointmentId);
    if (target) {
      const updated: B2BAppointment = {
        ...target,
        status,
        updatedAt: new Date().toISOString().split('T')[0],
      };
      await saveCentralB2BAppointment(updated, currentRole);
    }
  };

  // Reset to original 101 leads (opens confirmation dialog)
  const handleResetLeads = () => {
    if (!isAdmin) {
      setPermissionError('สิทธิ์ไม่เพียงพอ: เฉพาะ Administrator เท่านั้นที่สามารถรีเซ็ตข้อมูลได้');
      return;
    }
    setIsResetConfirmOpen(true);
  };

  // Execute confirmed reset
  const confirmResetData = async () => {
    await resetCentralB2BToDefault(currentRole);
    setIsResetConfirmOpen(false);
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leadsList.filter((lead) => {
      const offerText = lead.offer || lead.proposalOffer || '';
      const formatText = lead.format || lead.opportunity || '';
      const stageText = lead.pipelineStage || lead.contactStatus || 'ยังไม่ติดต่อ';
      const orgTypeText = lead.orgType || lead.categoryType || '';
      const reasonText = lead.reasonsToApproach || '';

      const matchesSearch =
        !searchTerm.trim() ||
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offerText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orgTypeText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reasonText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.contactPerson && lead.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesPriority =
        selectedPriority === 'All' || lead.priority === selectedPriority;

      const matchesStage =
        selectedStage === 'All' || stageText === selectedStage;

      const matchesOrgType =
        selectedOrgType === 'All' || orgTypeText === selectedOrgType;

      return matchesSearch && matchesPriority && matchesStage && matchesOrgType;
    });
  }, [leadsList, searchTerm, selectedPriority, selectedStage, selectedOrgType]);

  const handleUpdateLeadStage = async (leadId: string, newStage: string) => {
    if (!isOperatorOrAdmin) {
      setPermissionError('สิทธิ์ไม่เพียงพอ: เฉพาะ Operator และ Administrator เท่านั้นที่สามารถเปลี่ยนสถานะติดตามงานได้');
      return;
    }
    const target = leadsList.find((l) => l.id === leadId);
    if (target) {
      const updatedLead: B2BLead = {
        ...target,
        pipelineStage: newStage,
        contactStatus: newStage,
        updatedAt: new Date().toISOString().split('T')[0],
      };
      await saveCentralB2BLead(updatedLead, currentRole);
      if (activeLeadModal && activeLeadModal.id === leadId) {
        setActiveLeadModal(updatedLead);
      }
    }
  };

  const handleCopyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyScriptText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Scheduled appointments for the active lead modal
  const activeLeadAppointments = useMemo(() => {
    if (!activeLeadModal) return [];
    return appointments.filter(
      (a) => a.leadId === activeLeadModal.id || a.leadName === activeLeadModal.name
    );
  }, [activeLeadModal, appointments]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Role Notice Banner if Permission Error */}
      {permissionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl flex items-center justify-between text-sm shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{permissionError}</span>
          </div>
          <button
            onClick={() => setPermissionError(null)}
            className="text-rose-600 hover:text-rose-800 text-xs font-bold px-2 py-1 rounded-lg hover:bg-rose-100 transition-colors"
          >
            ปิด
          </button>
        </div>
      )}

      {/* 1. Header Banner with Action Buttons */}
      <div className="bg-gradient-to-r from-[#173826] via-[#214D35] to-[#173826] rounded-3xl p-5 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full opacity-10 pointer-events-none flex items-center justify-end pr-6">
          <Building className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold text-[#E9C784]">
              <Target className="w-3.5 h-3.5" />
              <span>ฐานข้อมูลพันธมิตร & Mini MICE B2B ({leadsList.length} รายการ)</span>
            </div>

            {/* Quick Export & Add Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {onOpenGoogleSheetsDbModal && (
                <button
                  onClick={onOpenGoogleSheetsDbModal}
                  className="px-3.5 py-1.5 rounded-xl bg-[#107C41] hover:bg-[#0D6535] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border border-emerald-400/30 cursor-pointer"
                  title="เชื่อมต่อและซิงค์ฐานข้อมูลนัดหมาย B2B กับ Google Sheets"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>ฐานข้อมูล Google Sheets</span>
                  {sheetsDbConfig ? (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
                      เชื่อมต่อแล้ว
                    </span>
                  ) : null}
                </button>
              )}

              {sheetsDbConfig && (
                <a
                  href={sheetsDbConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-all flex items-center gap-1 border border-white/20 shadow-sm"
                  title="เปิดดูชีตการนัดหมาย B2B ใน Google Sheets"
                >
                  <span>เปิด Google Sheets</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/20 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export ข้อมูล (Excel / TSV)</span>
              </button>

              <button
                onClick={() => {
                  setEditingLead(null);
                  setIsAddLeadModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#2E7D4E] hover:bg-[#256941] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ เพิ่มศูนย์ประสานงาน</span>
              </button>

              <button
                onClick={() => {
                  setEditingApt(null);
                  setAptDefaultDate('2026-09-09');
                  setAptDefaultLead(null);
                  setIsAddAptModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#C89B3C] hover:bg-[#B3872E] text-[#1E3A29] text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>+ ลงตารางนัดหมาย</span>
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight mb-2 font-heading text-[#FFFDF8]">
              ศูนย์ประสานงานกลุ่มเป้าหมายองค์กร, B2B Leads & กำหนดการนัดหมาย
            </h2>
            <p className="text-sm sm:text-base text-[#D4E3D8] leading-relaxed">
              จัดการข้อมูล 101 หน่วยงานราชการ สถาบันการศึกษา รัฐวิสาหกิจ พร้อมระบบปฏิทินนัดหมายเข้าพบ
              สคริปต์การขาย และการส่งออกข้อมูลสำหรับทำรายงานผู้บริหาร
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[#E3EEE6] pt-1">
            <div className="bg-black/20 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#52D273]" />
              <span>เป้าหมายระยะแรก: 20 Target → ติดต่อ 15 → เข้าพบ 10 → ตกลง 5 ราย</span>
            </div>
            <div className="bg-black/20 px-3 py-1.5 rounded-xl border border-white/10">
              Sweet Spot: <strong>ทีม 5–50 คน (ค่าห้องรายชั่วโมง + สวนอาหาร)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#DFE6DC] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#637C6D] font-medium mb-1">
            <span>กลุ่มเป้าหมายทั้งหมด</span>
            <Building className="w-4 h-4 text-[#2C573F]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#143623]">
            {leadsList.length} <span className="text-xs font-normal text-[#6F887A]">แห่ง</span>
          </div>
          <div className="text-[11px] text-[#4F715E] mt-1">
            หน่วยงานในระบบทั้งหมด
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#DFE6DC] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#966317] font-medium mb-1">
            <span>Priority A (เข้าหาด่วน)</span>
            <Award className="w-4 h-4 text-[#B5781C]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#B06B0E]">
            {leadsList.filter((l) => l.priority === 'A').length}{' '}
            <span className="text-xs font-normal text-[#966317]">ราย</span>
          </div>
          <div className="text-[11px] text-[#A6752C] mt-1">
            ความพร้อมจัดงานและงบประมาณสูง
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#DFE6DC] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#1D5E34] font-medium mb-1">
            <span>นัดหมายในปฏิทิน</span>
            <Calendar className="w-4 h-4 text-[#2D5A43]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#1B432E]">
            {appointments.length}{' '}
            <span className="text-xs font-normal text-[#6F887A]">นัดหมาย</span>
          </div>
          <div className="text-[11px] text-[#4F715E] mt-1">
            รอเข้าพบ {appointments.filter((a) => a.status === 'scheduled').length} รายการ
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#DFE6DC] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#305C42] font-medium mb-1">
            <span>เริ่มติดต่อ / ตกลงแล้ว</span>
            <CheckCircle2 className="w-4 h-4 text-[#237A40]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#1E7438]">
            {leadsList.filter(
              (l) =>
                l.pipelineStage === 'ติดต่อแล้ว' ||
                l.pipelineStage === 'นัดเข้าพบ' ||
                l.pipelineStage === 'ตกลง Partnership' ||
                l.pipelineStage === 'ปิดการขายแล้ว'
            ).length}{' '}
            <span className="text-xs font-normal text-[#6F887A]">ราย</span>
          </div>
          <div className="text-[11px] text-[#34784C] mt-1">
            เข้าสู่กระบวนการเจรจา
          </div>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs: Directory vs Calendar */}
      <div className="flex items-center justify-between border-b border-[#E3ECE1] pb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('directory')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'directory'
                ? 'bg-[#1B3E2D] text-white shadow-md'
                : 'bg-white text-[#52705E] hover:bg-[#F0F5EE] border border-[#DDE7DC]'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>รายชื่อศูนย์ประสานงาน & หน่วยงาน ({leadsList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('calendar')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'calendar'
                ? 'bg-[#1B3E2D] text-white shadow-md'
                : 'bg-white text-[#52705E] hover:bg-[#F0F5EE] border border-[#DDE7DC]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>ปฏิทินนัดหมาย & กำหนดการเข้าพบ</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#C89B3C] text-[#1A3324] font-extrabold">
              {appointments.filter((a) => a.status === 'scheduled').length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetLeads}
            className="text-xs text-[#7B9786] hover:text-[#2D5A43] flex items-center gap-1 font-semibold p-1 hover:underline"
            title="รีเซ็ตเป็นข้อมูล 101 หน่วยงานเริ่มต้น"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">รีเซ็ตข้อมูลเริ่มต้น</span>
          </button>
        </div>
      </div>

      {/* 4. TAB CONTENT */}
      {activeSubTab === 'calendar' ? (
        /* CALENDAR VIEW */
        <B2BCalendarView
          appointments={appointments}
          leads={leadsList}
          onAddAppointment={(date) => {
            setEditingApt(null);
            setAptDefaultDate(date || '2026-09-09');
            setAptDefaultLead(null);
            setIsAddAptModalOpen(true);
          }}
          onEditAppointment={(apt) => {
            setEditingApt(apt);
            setIsAddAptModalOpen(true);
          }}
          onDeleteAppointment={handleDeleteAppointment}
          onUpdateStatus={handleUpdateAppointmentStatus}
          onSelectLeadForSearch={onSelectLeadForSearch}
        />
      ) : (
        /* DIRECTORY VIEW */
        <div className="space-y-6">
          {/* TOP 5 QUICK-WIN RECOMMENDATIONS */}
          <div className="bg-[#FAF9F5] rounded-3xl p-5 sm:p-6 border border-[#E2DBD0] shadow-xs">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <span className="text-xs font-bold text-[#8C6218] uppercase tracking-wider block">
                  RECOMMENDED TARGETS
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#1F412F]">
                  Top 5 หน่วยงานแนะนำเร่งด่วน (Quick-Win Opportunities)
                </h3>
              </div>
              <span className="text-xs bg-[#F2ECE1] text-[#715426] px-3 py-1 rounded-full font-medium">
                เข้าหาได้ผลตอบรับทันที
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {TOP_RECOMMENDED_TARGETS.map((target) => (
                <div
                  key={target.leadId}
                  onClick={() => {
                    const match = leadsList.find((l) => l.id === target.leadId);
                    if (match) setActiveLeadModal(match);
                  }}
                  className="bg-white p-3.5 rounded-2xl border border-[#E6E0D5] hover:border-[#215E39] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-6 h-6 rounded-full bg-[#1F4C33] text-white text-xs font-bold flex items-center justify-center">
                        {target.rank}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#EEF5EB] text-[#225736]">
                        {target.leadId}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#153825] group-hover:text-[#1B6137] transition-colors line-clamp-1">
                      {target.name}
                    </h4>
                    <p className="text-xs text-[#4F6C5B] mt-1.5 line-clamp-2 leading-relaxed">
                      💡 {target.reason}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#F0F4EE] flex items-center justify-between text-xs">
                    <span className="text-[11px] text-[#71897A] truncate max-w-[170px]">
                      {target.format}
                    </span>
                    <span className="text-[#1E6135] font-bold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      <span>ดูสคริปต์</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DEE5DB] shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#738C7D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อศูนย์ประสานงาน, หน่วยงาน, ผู้ประสานงาน, รูปแบบงาน หรือข้อเสนอ..."
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-[#D5E0D2] focus:outline-none focus:ring-2 focus:ring-[#235838] bg-[#FAF9F6]"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7B9284] hover:text-[#1F3E2E]"
                  >
                    ล้าง
                  </button>
                )}
              </div>

              {/* Priority Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs font-semibold text-[#5A7465] shrink-0 mr-1">
                  Priority:
                </span>
                {(['All', 'A', 'B', 'C'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPriority(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                      selectedPriority === p
                        ? 'bg-[#183E2A] text-white shadow-2xs'
                        : 'bg-[#F2EFE8] hover:bg-[#EAE5DB] text-[#41594A]'
                    }`}
                  >
                    {p === 'All' ? `ทั้งหมด (${leadsList.length})` : `Priority ${p}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Pipeline Stage Quick Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1 text-xs">
              <span className="font-semibold text-[#617B6D] shrink-0">สถานะ Pipeline:</span>
              <button
                onClick={() => setSelectedStage('All')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                  selectedStage === 'All'
                    ? 'bg-[#235838] text-white font-bold'
                    : 'bg-[#FAF8F2] text-[#4A6455] hover:bg-[#EAE4D7]'
                }`}
              >
                ทั้งหมด
              </button>
              {PIPELINE_STAGES.map((st) => (
                <button
                  key={st.stage}
                  onClick={() => setSelectedStage(st.stage)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                    selectedStage === st.stage
                      ? 'bg-[#235838] text-white font-bold'
                      : 'bg-[#FAF8F2] text-[#4A6455] hover:bg-[#EAE4D7]'
                  }`}
                >
                  {st.stage}
                </button>
              ))}
            </div>
          </div>

          {/* Leads Listing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#526D5E] px-1">
              <span>
                พบ <strong>{filteredLeads.length}</strong> หน่วยงาน (จากทั้งหมด {leadsList.length} แห่ง)
              </span>
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="text-[#2D5A43] hover:underline font-bold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export รายการที่เลือกเป็น Excel</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setActiveLeadModal(lead)}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E0E7DC] hover:border-[#215E39] hover:shadow-sm transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3.5 flex-1">
                    {/* Priority Badge */}
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        lead.priority === 'A'
                          ? 'bg-[#FBEBEB] text-[#9A2222] border border-[#F3C5C5]'
                          : lead.priority === 'B'
                          ? 'bg-[#FEF5E7] text-[#975F11] border border-[#F5DCB5]'
                          : 'bg-[#EEF5EC] text-[#245C3A] border border-[#CCE4D0]'
                      }`}
                    >
                      {lead.priority}
                    </div>

                    {/* Main Info */}
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-bold text-[#133824] group-hover:text-[#186237] transition-colors">
                          {lead.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded-md bg-[#EDF3EC] text-[#345B45]">
                          {lead.id}
                        </span>
                        {(lead.orgType || lead.categoryType) && (
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#FAF5EB] text-[#7C5A1C] border border-[#EFE5D0]">
                            {lead.orgType || lead.categoryType}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#526D5E] line-clamp-1">
                        🎯 สิ่งที่ควรเสนอ: <strong>{lead.offer || lead.proposalOffer || 'Corporate Rate + ห้องประชุม VIP'}</strong>
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-[#728A7C] flex-wrap">
                        {lead.contactPerson && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-[#3E654E]" />
                            <span>{lead.contactPerson}</span>
                          </span>
                        )}
                        {lead.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-[#3E654E]" />
                            <span>{lead.phone}</span>
                          </span>
                        )}
                        {(lead.format || lead.opportunity) && (
                          <span className="bg-[#FAF9F5] px-2 py-0.5 rounded border border-[#EDE8DB]">
                            รูปแบบ: {lead.format || lead.opportunity}
                          </span>
                        )}
                        {lead.appointmentDate && (
                          <span className="bg-[#EEF5EC] text-[#1E7438] px-2 py-0.5 rounded font-semibold border border-[#D2E7CE]">
                            📅 นัด: {lead.appointmentDate} {lead.appointmentTime || ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions on Card */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                        (lead.pipelineStage || lead.contactStatus) === 'ติดต่อแล้ว'
                          ? 'bg-[#E5F5E4] text-[#1E7438] border-[#C3E8C1]'
                          : (lead.pipelineStage || lead.contactStatus) === 'ตกลง Partnership' ||
                            (lead.pipelineStage || lead.contactStatus) === 'ตกลงแล้ว'
                          ? 'bg-[#DBEAFE] text-[#1D4ED8] border-[#BFDBFE]'
                          : (lead.pipelineStage || lead.contactStatus) === 'นัดเข้าพบ'
                          ? 'bg-[#FFF4E5] text-[#B76E00] border-[#FFE2B8]'
                          : 'bg-[#FAF8F2] text-[#697E72] border-[#E8E1D2]'
                      }`}
                    >
                      {lead.pipelineStage || lead.contactStatus || 'ยังไม่ติดต่อ'}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingApt(null);
                        setAptDefaultLead(lead);
                        setAptDefaultDate(lead.appointmentDate || '2026-09-10');
                        setIsAddAptModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-[#FAFBF8] hover:bg-[#EEF5EC] text-[#24563B] border border-[#DEE7DC] transition-colors"
                      title="ลงตารางนัดหมายกับหน่วยงานนี้"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingLead(lead);
                        setIsAddLeadModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-[#FAFBF8] hover:bg-[#EEF5EC] text-[#24563B] border border-[#DEE7DC] transition-colors"
                      title="แก้ไขข้อมูลหน่วยงาน"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveLeadModal(lead);
                      }}
                      className="p-2 rounded-xl text-[#39634B] hover:bg-[#EEF5EB] transition-colors"
                      title="ดูสคริปต์โทรและข้อมูลเชิงลึก"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. ACTIVE LEAD DETAIL & CALL SCRIPT MODAL */}
      {activeLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full my-6 overflow-hidden border border-[#E0E7DC] space-y-4 p-5 sm:p-7 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#F0F5EE] pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                    activeLeadModal.priority === 'A'
                      ? 'bg-[#FBEBEB] text-[#9A2222] border border-[#F3C5C5]'
                      : activeLeadModal.priority === 'B'
                      ? 'bg-[#FEF5E7] text-[#975F11] border border-[#F5DCB5]'
                      : 'bg-[#EEF5EC] text-[#245C3A] border border-[#CCE4D0]'
                  }`}
                >
                  {activeLeadModal.priority}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#446853]">
                      {activeLeadModal.id}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF5EB] text-[#7E5C1D]">
                      {activeLeadModal.orgType || activeLeadModal.categoryType}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#143623]">
                    {activeLeadModal.name}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setEditingLead(activeLeadModal);
                    setIsAddLeadModalOpen(true);
                  }}
                  className="p-2 rounded-xl text-[#345945] hover:bg-[#EEF5EC] transition-colors"
                  title="แก้ไขข้อมูล"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteLead(activeLeadModal.id)}
                  className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                  title="ลบหน่วยงานนี้"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveLeadModal(null)}
                  className="w-8 h-8 rounded-full bg-[#F3F2EC] hover:bg-[#E8E6DC] text-[#4E6759] flex items-center justify-center text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Core Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div className="bg-[#FAFBF9] p-3.5 rounded-2xl border border-[#E9EFE7] space-y-1">
                <span className="text-[#647F70] text-xs font-semibold block">
                  👤 ผู้ประสานงาน / รูปแบบความร่วมมือ:
                </span>
                <p className="font-bold text-[#1B3E2D]">
                  {activeLeadModal.cooperationType ||
                    activeLeadModal.contactPerson ||
                    'หัวหน้างานอบรม / ฝ่ายธุรการ'}
                </p>
              </div>

              <div className="bg-[#FAFBF9] p-3.5 rounded-2xl border border-[#E9EFE7] space-y-1">
                <span className="text-[#647F70] text-xs font-semibold block">
                  📞 เบอร์โทรศัพท์ / ติดต่อ:
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#1B3E2D]">
                    {activeLeadModal.phone || 'โทรสอบถามผ่านส่วนกลาง'}
                  </span>
                  {activeLeadModal.phone && (
                    <button
                      onClick={() => handleCopyPhone(activeLeadModal.phone!)}
                      className="text-xs text-[#206038] font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {copiedPhone === activeLeadModal.phone ? (
                        <span className="text-[#1E7238]">คัดลอกแล้ว ✓</span>
                      ) : (
                        <span>คัดลอกเบอร์</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Scheduled Appointments for this lead */}
            {activeLeadAppointments.length > 0 && (
              <div className="bg-[#EEF6EB] p-3.5 rounded-2xl border border-[#D0E5CC] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#1F5434]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#1E7438]" />
                    <span>มีนัดหมายในปฏิทิน ({activeLeadAppointments.length} รายการ)</span>
                  </span>
                  <button
                    onClick={() => {
                      setActiveSubTab('calendar');
                      setActiveLeadModal(null);
                    }}
                    className="text-[#1E7438] hover:underline"
                  >
                    เปิดดูในปฏิทิน →
                  </button>
                </div>
                <div className="space-y-1.5">
                  {activeLeadAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-2.5 rounded-xl bg-white text-xs border border-[#D5E6D2] flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-[#183D28]">
                          📅 {apt.date} เวลา {apt.time} น.
                        </span>
                        <p className="text-[11px] text-[#557764]">{apt.title}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            apt.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {apt.status === 'completed' ? 'พบแล้ว' : 'รอเข้าพบ'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingApt(apt);
                            setIsAddAptModalOpen(true);
                          }}
                          className="p-1 rounded-md hover:bg-gray-200 text-[#597866] cursor-pointer"
                          title="แก้ไขนัดหมาย"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAppointment(apt.id)}
                          className="p-1 rounded-md hover:bg-red-100 text-red-500 cursor-pointer"
                          title="ลบนัดหมาย"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strategy & Recommended Offer */}
            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#E8E2D5] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#7E5717] uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-[#A8741D]" />
                <span>ข้อเสนอและจุดที่ควรชู (Tailored Offer)</span>
              </div>
              <p className="text-sm font-semibold text-[#183927] leading-relaxed">
                👉 {activeLeadModal.offer || activeLeadModal.proposalOffer}
              </p>
              <div className="text-xs text-[#5D7768] pt-1 space-y-1">
                <div>
                  รูปแบบการใช้งานที่เหมาะ: <strong>{activeLeadModal.format || activeLeadModal.opportunity}</strong>
                </div>
                {activeLeadModal.reasonsToApproach && (
                  <div className="text-[#685223]">
                    เหตุผลที่ควรเข้าหา: {activeLeadModal.reasonsToApproach}
                  </div>
                )}
              </div>
            </div>

            {/* PHONE COLD CALL SCRIPT */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-[#C6DFC6] shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#F0F5EE]">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#1E6738]" />
                  <span className="text-xs sm:text-sm font-bold text-[#143825]">
                    สคริปต์โทรแนะนำสถานที่ (Phone Script)
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleCopyScriptText(
                      `สวัสดีค่ะ/ครับ ขออนุญาตเรียนสายฝ่ายฝึกอบรม/ผู้ประสานงานค่ะ ทางบ้านโฮม สวนอาหาร&รีสอร์ท ยางตลาด ขอแนะนำห้องประชุม VIP และแพ็กเกจ Meeting & Stay สำหรับงานอบรมคณะขนาด 5–50 ท่าน คิดค่าบริการได้ทั้งแบบรายชั่วโมงและมีอาหารจัดเลี้ยงครบวงจรค่ะ สามารถส่งใบเสนอราคาและ Rate Card พิเศษให้ทาง LINE ได้นะคะ`
                    )
                  }
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-[#1B3E2D] hover:bg-[#122E21] text-white cursor-pointer shadow-2xs"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'คัดลอกสคริปต์แล้ว' : 'คัดลอกสคริปต์โทร'}</span>
                </button>
              </div>

              <div className="bg-[#FAFBF9] p-3.5 rounded-xl border border-[#E8EFE7] text-xs sm:text-sm text-[#183626] leading-relaxed select-all">
                “สวัสดีค่ะ/ครับ ขออนุญาตเรียนสายฝ่ายจัดอบรมหรือผู้ดูแลสถานที่ค่ะ 🙏 ทางบ้านโฮม สวนอาหาร&รีสอร์ท อ.ยางตลาด ขออนุญาตแนะนำบริการห้องประชุม VIP ปรับอากาศ (ขนาด 5–50 ท่าน) รองรับงานสัมมนา อบรมเชิงปฏิบัติการ และรับรองคณะค่ะ จุดเด่นของเราคือคิดค่าบริการได้ทั้งรายชั่วโมงและเหมาวัน พร้อมสวนอาหารชื่อดังและที่พักในพื้นที่เดียวค่ะ วันนี้ขออนุญาตส่งแคตตาล็อกหรือทำใบเสนอราคา Corporate Rate พิเศษให้พิจารณาได้ไหมคะ 😊”
              </div>
            </div>

            {/* Quick Action to Schedule Appointment */}
            <div className="flex items-center justify-between pt-2 border-t border-[#EEF3ED] gap-2 flex-wrap">
              <button
                onClick={() => {
                  setEditingApt(null);
                  setAptDefaultLead(activeLeadModal);
                  setAptDefaultDate('2026-09-10');
                  setIsAddAptModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#2D5A43] hover:bg-[#204533] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Calendar className="w-4 h-4" />
                <span>+ ลงตารางนัดหมายเข้าพบ</span>
              </button>

              {/* Pipeline Stage Quick Changer */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-[#557262] font-semibold">ปรับสถานะ:</span>
                {['ยังไม่ติดต่อ', 'ติดต่อแล้ว', 'นัดเข้าพบ', 'ตกลง Partnership'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateLeadStage(activeLeadModal.id, st)}
                    className={`px-3 py-1 rounded-xl font-semibold cursor-pointer transition-colors ${
                      activeLeadModal.pipelineStage === st
                        ? 'bg-[#1E5D36] text-white'
                        : 'bg-[#F1EFE8] hover:bg-[#E5E2D7] text-[#41594A]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODALS: Add/Edit Lead, Add/Edit Appointment, Export Modal */}
      <AddLeadModal
        isOpen={isAddLeadModalOpen}
        onClose={() => setIsAddLeadModalOpen(false)}
        onSave={handleSaveLead}
        editLead={editingLead}
      />

      <AddAppointmentModal
        isOpen={isAddAptModalOpen}
        onClose={() => setIsAddAptModalOpen(false)}
        onSave={handleSaveAppointment}
        leads={leadsList}
        editAppointment={editingApt}
        defaultDate={aptDefaultDate}
        defaultLead={aptDefaultLead}
      />

      <ExportB2BModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        leads={leadsList}
        appointments={appointments}
        filteredLeadsCount={filteredLeads.length}
      />

      {/* 7. IN-APP CONFIRMATION DIALOGS (Reliable inside iframes) */}
      {/* 7.1 Confirm Delete Appointment Modal */}
      {appointmentToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm sm:max-w-md w-full shadow-2xl border border-red-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-[#1F3E2D]">
                ยืนยันการลบนัดหมาย?
              </h3>
              <p className="text-xs text-[#527060]">
                ต้องการลบนัดหมายนี้ออกจากปฏิทินและระบบใช่หรือไม่
              </p>
            </div>

            <div className="bg-[#FAFBF9] p-3.5 rounded-2xl border border-[#E7EFE5] text-xs space-y-1.5">
              <div className="font-bold text-[#143623]">{appointmentToDelete.leadName}</div>
              <div className="text-[#3A634C]">{appointmentToDelete.title}</div>
              <div className="text-[#648372]">
                📅 วันที่ {appointmentToDelete.date} เวลา {appointmentToDelete.time} น.
              </div>
              {appointmentToDelete.location && (
                <div className="text-[11px] text-[#789686]">
                  📍 {appointmentToDelete.location}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAppointmentToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteAppointment}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>ยืนยันลบนัดหมาย</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7.2 Confirm Delete Lead Modal */}
      {leadToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm sm:max-w-md w-full shadow-2xl border border-red-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-[#1F3E2D]">
                ยืนยันการลบศูนย์ประสานงาน?
              </h3>
              <p className="text-xs text-[#527060]">
                คุณต้องการลบข้อมูลหน่วยงานนี้ออกจากระบบใช่หรือไม่
              </p>
            </div>

            <div className="bg-[#FAFBF9] p-3.5 rounded-2xl border border-[#E7EFE5] text-xs space-y-1">
              <div className="font-bold text-[#143623]">{leadToDelete.name}</div>
              <div className="text-[#648372]">รหัส: {leadToDelete.id}</div>
              {leadToDelete.contactPerson && (
                <div className="text-[11px] text-[#789686]">
                  ผู้ประสานงาน: {leadToDelete.contactPerson}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setLeadToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteLead}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>ยืนยันการลบ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7.3 Confirm Reset All Data Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm sm:max-w-md w-full shadow-2xl border border-amber-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-[#1F3E2D]">
                รีเซ็ตข้อมูลเป็นค่าเริ่มต้น?
              </h3>
              <p className="text-xs text-[#527060] leading-relaxed">
                ต้องการคืนค่าเป็นรายชื่อ 101 หน่วยงานและนัดหมายเริ่มต้นใช่หรือไม่? รายการที่ท่านสร้างหรือแก้ไขใหม่จะถูกคืนค่า
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmResetData}
                className="flex-1 py-2.5 rounded-xl bg-[#2D5A43] hover:bg-[#1E4330] text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>ยืนยันรีเซ็ต</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
