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
  Copy,
  Check,
  Award,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Calendar,
  Plus,
  Download,
  Edit2,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { B2BLead, B2BAppointment, B2BCoordinator, B2BPipelineStatus, AppointmentStatus, StaffProfile, UserRole } from '../types';
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
import { B2BCoordinatorManagerModal } from './B2BCoordinatorManagerModal';
import { ExportB2BModal } from './ExportB2BModal';
import { GoogleSheetsDbConfig } from '../utils/googleSheetsDatabase';
import { getGoogleAccessToken } from '../utils/googleWorkspaceAuth';
import {
  subscribeCentralB2B,
  saveCentralB2BLead,
  deleteCentralB2BLead,
  saveCentralB2BAppointment,
  saveCentralB2BWorkflow,
  closeCentralB2BSalesCycle,
  deleteCentralB2BAppointment,
  resetCentralB2BToDefault,
  canUserEditOperational,
  canUserManageSystem,
  getCachedLeads,
  getCachedAppointments,
} from '../utils/b2bService';
import { getActiveSessionUser } from '../utils/authService';
import { subscribeB2BCoordinators } from '../utils/b2bCoordinatorService';
import { localDateKey } from '../utils/dateUtils';

interface B2BPartnershipsViewProps {
  onSelectLeadForSearch?: (leadName: string) => void;
  onOpenGoogleSheetsDbModal?: () => void;
  sheetsDbConfig?: GoogleSheetsDbConfig | null;
  currentUser?: StaffProfile | null;
}

export const B2BPartnershipsView: React.FC<B2BPartnershipsViewProps> = ({
  onSelectLeadForSearch,
  sheetsDbConfig,
  currentUser,
}) => {
  const activeUser = currentUser || getActiveSessionUser();
  const currentRole: UserRole = activeUser?.role || 'Knowledge User';
  const isOperatorOrAdmin = canUserEditOperational(currentRole);
  const isAdmin = canUserManageSystem(currentRole);

  const actorName = activeUser?.name || activeUser?.username || 'Unknown User';
  const actorId = activeUser?.id || activeUser?.username || '';

  const fieldLabels: Record<string, string> = {
    name: 'ชื่อหน่วยงาน',
    orgType: 'ประเภทหน่วยงาน',
    contactPerson: 'ผู้ติดต่อฝั่งลูกค้า',
    contactPosition: 'ตำแหน่งผู้ติดต่อ',
    phone: 'เบอร์โทร',
    email: 'อีเมล / LINE',
    eventType: 'ประเภทงาน',
    attendeesEstimate: 'จำนวนผู้เข้าร่วม',
    eventDate: 'วันที่คาดว่าจะจัดงาน',
    eventRequirements: 'รายละเอียดความต้องการ',
    baanHomeCoordinatorName: 'ผู้ประสานงานบ้านโฮม',
    priority: 'Priority',
    pipelineStage: 'สถานะการติดตาม',
    reasonsToApproach: 'เหตุผลที่ควรเข้าพบ',
    nextAction: 'ขั้นตอนถัดไป',
    featuredOffers: 'ข้อเสนอที่ควรชู',
    offerDetails: 'รายละเอียดข้อเสนอ',
  };

  const formatHistoryValue = (value: unknown) => {
    if (Array.isArray(value)) return value.join(', ') || 'ยังไม่ระบุ';
    if (value === undefined || value === null || value === '') return 'ยังไม่ระบุ';
    return String(value);
  };

  const buildLeadHistory = (before: B2BLead | undefined, after: B2BLead, action: string) => {
    const trackedFields = Object.keys(fieldLabels);
    const changes = before
      ? trackedFields
          .filter((key) => JSON.stringify((before as any)[key] ?? '') !== JSON.stringify((after as any)[key] ?? ''))
          .map((key) => `${fieldLabels[key]}: "${formatHistoryValue((before as any)[key])}" → "${formatHistoryValue((after as any)[key])}"`)
      : [`สร้างข้อมูลหน่วยงาน: ${after.name}`];

    if (changes.length === 0) return after.history || [];
    return [
      {
        id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        actorId,
        actorName,
        action,
        changes,
      },
      ...(after.history || before?.history || []),
    ].slice(0, 100);
  };

  const getLeadStage = (lead: B2BLead) => {
    const raw = lead.pipelineStage || lead.contactStatus || 'ยังไม่ติดต่อ';
    return raw === 'เข้าพบแล้ว' ? 'ติดตามต่อ' : raw;
  };

  const getAppointmentRelativeLabel = (date?: string) => {
    if (!date) return '';
    const todayKey = localDateKey();
    const parseKey = (key: string) => {
      const [y, m, d] = key.split('-').map(Number);
      return Date.UTC(y, m - 1, d);
    };
    const diffDays = Math.round((parseKey(date) - parseKey(todayKey)) / 86400000);
    if (diffDays === 0) return 'วันนี้';
    if (diffDays === 1) return 'พรุ่งนี้';
    if (diffDays > 1) return `อีก ${diffDays} วัน`;
    if (diffDays === -1) return 'เมื่อวาน';
    return `ผ่านมาแล้ว ${Math.abs(diffDays)} วัน`;
  };

  const appointmentBelongsToLead = (apt: B2BAppointment, lead: B2BLead) =>
    apt.leadId ? apt.leadId === lead.id : apt.leadName === lead.name;

  const getScheduledAppointmentForLead = (
    lead: B2BLead,
    sourceAppointments: B2BAppointment[] = appointments,
    excludeId?: string
  ) => {
    const scheduled = sourceAppointments
      .filter(
        (apt) =>
          apt.id !== excludeId &&
          apt.status === 'scheduled' &&
          !apt.salesCycleClosedAt &&
          appointmentBelongsToLead(apt, lead)
      )
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

    if (!scheduled.length) return undefined;

    const nowKey = `${localDateKey()} ${new Date().toTimeString().slice(0, 5)}`;
    return scheduled.find((apt) => `${apt.date} ${apt.time}` >= nowKey) || scheduled[scheduled.length - 1];
  };

  const getCurrentCycleTimeline = (lead: B2BLead) => {
    const currentStage = getLeadStage(lead);
    const latestClosureAt = (lead.salesClosures || [])
      .map((item) => new Date(item.closedAt).getTime())
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => b - a)[0] || 0;

    const events = (lead.history || [])
      .map((entry) => {
        const timestamp = new Date(entry.timestamp).getTime();
        if (!Number.isFinite(timestamp) || timestamp <= latestClosureAt) return null;

        let stage = '';
        for (const change of entry.changes || []) {
          const match = change.match(/สถานะการติดตาม:\s*"[^"]*"\s*→\s*"([^"]+)"/);
          if (match?.[1]) {
            stage = match[1] === 'เข้าพบแล้ว' ? 'ติดตามต่อ' : match[1];
            break;
          }
        }
        if (!stage && entry.action === 'เข้าพบแล้ว') stage = 'ติดตามต่อ';
        return stage ? { stage, timestamp } : null;
      })
      .filter((item): item is { stage: string; timestamp: number } => Boolean(item))
      .sort((a, b) => a.timestamp - b.timestamp);

    const deduped: Array<{ stage: string; timestamp: number }> = [];
    for (const item of events) {
      if (deduped[deduped.length - 1]?.stage === item.stage) continue;
      deduped.push(item);
    }

    if (deduped.length === 0) {
      const raw = lead.updatedAt ? new Date(lead.updatedAt).getTime() : NaN;
      if (!Number.isFinite(raw)) return [];
      deduped.push({ stage: currentStage, timestamp: raw });
    } else if (deduped[deduped.length - 1].stage !== currentStage) {
      const raw = lead.updatedAt ? new Date(lead.updatedAt).getTime() : Date.now();
      deduped.push({ stage: currentStage, timestamp: Number.isFinite(raw) ? raw : Date.now() });
    }

    const now = Date.now();
    return deduped.map((item, index) => {
      const end = deduped[index + 1]?.timestamp || now;
      const days = Math.max(0, Math.floor((end - item.timestamp) / 86400000));
      return { stage: item.stage, days, current: index === deduped.length - 1 };
    });
  };

  const getLatestLeadActivity = (lead: B2BLead) => {
    const latestHistory = lead.history?.[0];
    const rawDate = latestHistory?.timestamp || lead.updatedAt || '';
    if (!rawDate) return null;

    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return null;

    return {
      date: parsed,
      actorName: latestHistory?.actorName || '',
      label: parsed.toLocaleString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const getLeadFollowUpAlert = (lead: B2BLead) => {
    const stage = getLeadStage(lead);
    if (!['ติดต่อแล้ว', 'นัดเข้าพบ', 'ติดตามต่อ', 'ส่งใบเสนอราคาแล้ว'].includes(stage)) return null;

    const latest = getLatestLeadActivity(lead);
    if (!latest) return null;

    const diffDays = Math.floor((Date.now() - latest.date.getTime()) / (1000 * 60 * 60 * 24));
    const hasUpcomingAppointment = appointments.some(
      (apt) =>
        apt.status === 'scheduled' &&
        !apt.salesCycleClosedAt &&
        appointmentBelongsToLead(apt, lead) &&
        new Date(`${apt.date}T${apt.time || '00:00'}`).getTime() >= Date.now()
    );

    if (stage === 'ติดต่อแล้ว' && diffDays >= 7 && !hasUpcomingAppointment) {
      return `ติดต่อแล้ว ${diffDays} วัน ยังไม่มีนัดเข้าพบ`;
    }
    if (stage === 'นัดเข้าพบ' && diffDays >= 3 && !hasUpcomingAppointment) {
      return `สถานะนัดเข้าพบค้าง ${diffDays} วัน ควรตรวจสอบนัดล่าสุด`;
    }
    if (stage === 'ติดตามต่อ' && diffDays >= 3) {
      return `ติดตามต่อ ${diffDays} วัน ควรอัปเดตผล`;
    }
    if (stage === 'ส่งใบเสนอราคาแล้ว' && diffDays >= 5) {
      return `ส่งใบเสนอราคาแล้ว ${diffDays} วัน ควรติดตามผล`;
    }
    return null;
  };

  // Sub-tabs: directory list vs calendar schedule
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'calendar'>('directory');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'All' | 'A' | 'B' | 'C'>('All');
  const [selectedStage, setSelectedStage] = useState<string>('All');
  const [selectedOrgType, setSelectedOrgType] = useState<string>('All');
  const [appointmentFilter, setAppointmentFilter] = useState<'All' | 'ready' | 'hasAppointment' | 'noAppointment'>('All');
  const [overviewFilter, setOverviewFilter] = useState<'All' | 'engaged'>('All');

  // Lead Detail Modal & clipboard states
  const [activeLeadModal, setActiveLeadModal] = useState<B2BLead | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // Persistent leads and appointments from central database
  const [leadsList, setLeadsList] = useState<B2BLead[]>(getCachedLeads);
  const [appointments, setAppointments] = useState<B2BAppointment[]>(getCachedAppointments);
  const [coordinators, setCoordinators] = useState<B2BCoordinator[]>([]);

  // Modals state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<B2BLead | null>(null);
  const [isAddAptModalOpen, setIsAddAptModalOpen] = useState(false);
  const [editingApt, setEditingApt] = useState<B2BAppointment | null>(null);
  const [aptDefaultDate, setAptDefaultDate] = useState<string>('2026-09-09');
  const [aptDefaultLead, setAptDefaultLead] = useState<B2BLead | null>(null);
  const [isCoordinatorManagerOpen, setIsCoordinatorManagerOpen] = useState(false);

  // In-App Confirmation Modals state (avoiding window.confirm which is blocked in sandboxed iframes)
  const [appointmentToDelete, setAppointmentToDelete] = useState<B2BAppointment | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<B2BLead | null>(null);
  const [closureToDelete, setClosureToDelete] = useState<{ leadId: string; closureId: string } | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Subscribe to Central Shared B2B Database in real-time across all users
  useEffect(() => {
    const unsubscribeB2B = subscribeCentralB2B(({ leads, appointments: apts }) => {
      setLeadsList(leads);
      setAppointments(apts);
    });
    const unsubscribeCoordinators = subscribeB2BCoordinators(setCoordinators);
    return () => {
      unsubscribeB2B();
      unsubscribeCoordinators();
    };
  }, []);

  // Handle Add or Edit Lead
  const handleSaveLead = async (
    lead: B2BLead,
    scheduleAppointment?: { date: string; time: string; title: string; location: string }
  ): Promise<boolean> => {
    if (!isOperatorOrAdmin) {
      setPermissionError('สิทธิ์ไม่เพียงพอ: เฉพาะ Operator และ Administrator เท่านั้นที่สามารถแก้ไขข้อมูลลูกค้า B2B ได้');
      return false;
    }

    const previousLead = leadsList.find((item) => item.id === lead.id);
    const leadWithHistory: B2BLead = {
      ...lead,
      history: buildLeadHistory(previousLead, lead, previousLead ? 'แก้ไขข้อมูลหน่วยงาน' : 'สร้างหน่วยงาน'),
    };

    const newAppointment: B2BAppointment | undefined = scheduleAppointment
      ? {
          id: `APT-${crypto.randomUUID()}`,
          leadId: leadWithHistory.id,
          leadName: leadWithHistory.name,
          date: scheduleAppointment.date,
          time: scheduleAppointment.time,
          title: scheduleAppointment.title,
          location: scheduleAppointment.location,
          objective: 'นำเสนอแพ็กเกจห้องประชุม & Corporate Rate',
          status: 'scheduled',
          contactPerson: leadWithHistory.contactPerson,
          phone: leadWithHistory.phone,
          priority: leadWithHistory.priority,
          createdAt: new Date().toISOString(),
        }
      : undefined;

    const result = newAppointment
      ? await saveCentralB2BWorkflow(
          {
            lead: {
              ...leadWithHistory,
              appointmentDate: newAppointment.date,
              appointmentTime: newAppointment.time,
            },
            appointment: newAppointment,
          },
          currentRole
        )
      : await saveCentralB2BLead(leadWithHistory, currentRole);

    if (!result.success) {
      setPermissionError(result.error || 'ไม่สามารถบันทึกข้อมูลได้');
      return false;
    }
    return true;
  };

  // Handle Delete Lead (opens confirmation dialog)
  const handleDeleteLead = (leadId: string) => {
    if (!isAdmin) {
      setPermissionError('สิทธิ์ไม่เพียงพอ: เฉพาะ Administrator เท่านั้นที่สามารถลบข้อมูลลูกค้า B2B ได้');
      return;
    }
    const target = leadsList.find((l) => l.id === leadId);
    if (target) {
      setDeleteError(null);
      setLeadToDelete(target);
    }
  };

  // Execute confirmed lead deletion
  const confirmDeleteLead = async () => {
    if (!leadToDelete || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteCentralB2BLead(leadToDelete.id, currentRole);
      if (!result.success) { setDeleteError(result.error || 'ลบไม่สำเร็จ'); return; }
      if (activeLeadModal?.id === leadToDelete.id) setActiveLeadModal(null);
      setLeadToDelete(null);
    } catch { setDeleteError('ลบไม่สำเร็จ กรุณาลองใหม่'); }
    finally { setIsDeleting(false); }
  };

  // Handle Add or Edit Appointment.
  // Appointment lifecycle is separate from sales progression, except that an active
  // appointment advances early-stage organizations to "นัดเข้าพบ". Later stages stay manual.
  const handleSaveAppointment = async (apt: B2BAppointment) => {
    if (!isOperatorOrAdmin) {
      setPermissionError('สิทธิ์ไม่เพียงพอ: เฉพาะ Operator และ Administrator เท่านั้นที่สามารถบันทึกนัดหมายได้');
      return false;
    }

    const linkedLead = leadsList.find((lead) =>
      apt.leadId ? lead.id === apt.leadId : lead.name === apt.leadName
    );
    if (!linkedLead) {
      setPermissionError('ไม่พบข้อมูลองค์กรที่ผูกกับนัดหมาย กรุณาเลือกองค์กรจากฐานข้อมูล');
      return false;
    }

    const isNewAppointment = !appointments.some((item) => item.id === apt.id);
    let updatedLead: B2BLead | undefined;

    // A real active appointment means the organization has reached "นัดเข้าพบ".
    // Only advance early stages; never downgrade later/manual stages such as quotation,
    // Partnership, or closed sale when a repeat appointment is added.
    const currentStage = getLeadStage(linkedLead);
    const shouldAdvanceToMeeting =
      apt.status === 'scheduled' &&
      (currentStage === 'ยังไม่ติดต่อ' || currentStage === 'ติดต่อแล้ว');

    if (isNewAppointment || shouldAdvanceToMeeting) {
      const changes = [
        ...(shouldAdvanceToMeeting
          ? [`สถานะการติดตาม: "${currentStage}" → "นัดเข้าพบ"`]
          : []),
        ...(isNewAppointment ? [`สร้างนัดวันที่ ${apt.date} เวลา ${apt.time}`] : []),
      ];

      updatedLead = {
        ...linkedLead,
        appointmentDate: apt.date,
        appointmentTime: apt.time,
        ...(shouldAdvanceToMeeting
          ? { pipelineStage: 'นัดเข้าพบ', contactStatus: 'นัดเข้าพบ' }
          : {}),
        updatedAt: localDateKey(),
        history: [
          ...(changes.length
            ? [{
                id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                timestamp: new Date().toISOString(),
                actorId,
                actorName,
                action: isNewAppointment ? 'สร้างนัดหมาย' : 'ซิงก์สถานะจากนัดหมาย',
                changes,
              }]
            : []),
          ...(linkedLead.history || []),
        ].slice(0, 100),
      };
    }

    const result = await saveCentralB2BWorkflow(
      { appointment: apt, ...(updatedLead ? { lead: updatedLead } : {}) },
      currentRole
    );
    if (!result.success) {
      setPermissionError(result.error || 'ไม่สามารถบันทึกนัดหมายได้');
      return false;
    }

    if (updatedLead && activeLeadModal?.id === updatedLead.id) setActiveLeadModal(updatedLead);
    return true;
  };

  const handleRescheduleAppointment = async (
    apt: B2BAppointment,
    newDate: string,
    newTime: string,
    reason: string
  ) => {
    if (!isOperatorOrAdmin) return false;
    if (!newDate || !newTime || (newDate === apt.date && newTime === apt.time)) return false;

    const linkedLead = leadsList.find((lead) =>
      apt.leadId ? lead.id === apt.leadId : lead.name === apt.leadName
    );
    if (!linkedLead) return false;

    const updatedAppointment: B2BAppointment = {
      ...apt,
      date: newDate,
      time: newTime,
      status: 'scheduled',
      rescheduleHistory: [
        ...(apt.rescheduleHistory || []),
        {
          id: `move_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          fromDate: apt.date,
          fromTime: apt.time,
          toDate: newDate,
          toTime: newTime,
          reason: reason.trim() || undefined,
          changedAt: new Date().toISOString(),
          changedById: actorId,
          changedByName: actorName,
        },
      ],
      updatedAt: localDateKey(),
    };

    const updatedLead: B2BLead = {
      ...linkedLead,
      appointmentDate: newDate,
      appointmentTime: newTime,
      updatedAt: localDateKey(),
      history: [
        {
          id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          actorId,
          actorName,
          action: 'เลื่อนนัด',
          changes: [
            `เลื่อนนัดจาก ${apt.date} ${apt.time} → ${newDate} ${newTime}`,
            ...(reason.trim() ? [`เหตุผล: ${reason.trim()}`] : []),
          ],
        },
        ...(linkedLead.history || []),
      ].slice(0, 100),
    };

    const result = await saveCentralB2BWorkflow(
      { appointment: updatedAppointment, lead: updatedLead },
      currentRole
    );
    if (!result.success) {
      setPermissionError(result.error || 'เลื่อนนัดไม่สำเร็จ');
      return false;
    }
    if (activeLeadModal?.id === updatedLead.id) setActiveLeadModal(updatedLead);
    return true;
  };

  const handleCompleteAppointment = async (
    apt: B2BAppointment,
    resultNote: string
  ) => {
    if (!isOperatorOrAdmin) return false;
    const linkedLead = leadsList.find((lead) =>
      apt.leadId ? lead.id === apt.leadId : lead.name === apt.leadName
    );
    if (!linkedLead) return false;

    const updatedAppointment: B2BAppointment = {
      ...apt,
      status: 'completed',
      resultNote: resultNote.trim() || undefined,
      completedAt: new Date().toISOString(),
      updatedAt: localDateKey(),
    };

    const oldStage = getLeadStage(linkedLead);
    const shouldAdvanceToVisited =
      oldStage === 'ยังไม่ติดต่อ' ||
      oldStage === 'ติดต่อแล้ว' ||
      oldStage === 'นัดเข้าพบ';
    const nextScheduledAppointment = getScheduledAppointmentForLead(linkedLead, appointments, apt.id);

    const updatedLead: B2BLead = {
      ...linkedLead,
      appointmentDate: nextScheduledAppointment?.date,
      appointmentTime: nextScheduledAppointment?.time,
      ...(shouldAdvanceToVisited
        ? { pipelineStage: 'ติดตามต่อ', contactStatus: 'ติดตามต่อ' }
        : {}),
      updatedAt: localDateKey(),
      history: [
        {
          id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          actorId,
          actorName,
          action: 'เข้าพบแล้ว',
          changes: [
            ...(shouldAdvanceToVisited
              ? [`สถานะการติดตาม: "${oldStage}" → "ติดตามต่อ"`]
              : []),
            `บันทึกผลนัดวันที่ ${apt.date} เวลา ${apt.time}`,
            ...(resultNote.trim() ? [`ผลการเข้าพบ: ${resultNote.trim()}`] : []),
          ],
        },
        ...(linkedLead.history || []),
      ].slice(0, 100),
    };

    const result = await saveCentralB2BWorkflow(
      { appointment: updatedAppointment, lead: updatedLead },
      currentRole
    );
    if (!result.success) {
      setPermissionError(result.error || 'บันทึกผลการเข้าพบไม่สำเร็จ');
      return false;
    }
    if (activeLeadModal?.id === updatedLead.id) setActiveLeadModal(updatedLead);
    return true;
  };

  const handleCancelAppointment = async (apt: B2BAppointment, reason: string) => {
    if (!isOperatorOrAdmin) return false;
    const linkedLead = leadsList.find((lead) =>
      apt.leadId ? lead.id === apt.leadId : lead.name === apt.leadName
    );
    if (!linkedLead) return false;

    const updatedAppointment: B2BAppointment = {
      ...apt,
      status: 'cancelled',
      cancelReason: reason.trim() || undefined,
      cancelledAt: new Date().toISOString(),
      updatedAt: localDateKey(),
    };

    const nextScheduledAppointment = getScheduledAppointmentForLead(linkedLead, appointments, apt.id);
    const updatedLead: B2BLead = {
      ...linkedLead,
      appointmentDate: nextScheduledAppointment?.date,
      appointmentTime: nextScheduledAppointment?.time,
      updatedAt: localDateKey(),
      history: [
        {
          id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          actorId,
          actorName,
          action: 'ยกเลิกนัด',
          changes: [
            `ยกเลิกนัดวันที่ ${apt.date} เวลา ${apt.time}`,
            ...(reason.trim() ? [`เหตุผล: ${reason.trim()}`] : []),
          ],
        },
        ...(linkedLead.history || []),
      ].slice(0, 100),
    };

    const result = await saveCentralB2BWorkflow(
      { appointment: updatedAppointment, lead: updatedLead },
      currentRole
    );
    if (!result.success) {
      setPermissionError(result.error || 'ยกเลิกนัดไม่สำเร็จ');
      return false;
    }
    if (activeLeadModal?.id === updatedLead.id) setActiveLeadModal(updatedLead);
    return true;
  };

  // Handle Delete Appointment (opens confirmation dialog)
  const handleDeleteAppointment = (appointmentId: string) => {
    if (!isAdmin) {
      setPermissionError('สิทธิ์ไม่เพียงพอ: เฉพาะ Administrator เท่านั้นที่สามารถลบนัดหมายได้');
      return;
    }
    const target = appointments.find((a) => a.id === appointmentId);
    if (target) {
      setDeleteError(null);
      setAppointmentToDelete(target);
    }
  };

  // Execute confirmed appointment deletion
  const confirmDeleteAppointment = async () => {
    if (!appointmentToDelete || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const deletingAppointment = appointmentToDelete;
      const linkedLead = leadsList.find((lead) =>
        deletingAppointment.leadId
          ? lead.id === deletingAppointment.leadId
          : lead.name === deletingAppointment.leadName
      );

      let result;
      let updatedLead: B2BLead | undefined;
      if (linkedLead) {
        const nextAppointment = getScheduledAppointmentForLead(
          linkedLead,
          appointments,
          deletingAppointment.id
        );
        updatedLead = {
          ...linkedLead,
          appointmentDate: nextAppointment?.date,
          appointmentTime: nextAppointment?.time,
          updatedAt: new Date().toISOString(),
          history: [
            {
              id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              timestamp: new Date().toISOString(),
              actorId,
              actorName,
              action: 'ลบนัดหมาย',
              changes: [`ลบนัดหมายวันที่ ${deletingAppointment.date} เวลา ${deletingAppointment.time}`],
            },
            ...(linkedLead.history || []),
          ].slice(0, 100),
        };
        result = await saveCentralB2BWorkflow(
          {
            lead: updatedLead,
            deleteAppointmentId: deletingAppointment.id,
            expectedAppointmentRevision: deletingAppointment._revision,
          },
          currentRole
        );
      } else {
        result = await deleteCentralB2BAppointment(deletingAppointment.id, currentRole);
      }

      if (!result.success) {
        setDeleteError(result.error || 'ลบไม่สำเร็จ');
        return;
      }
      if (updatedLead && activeLeadModal?.id === updatedLead.id) setActiveLeadModal(updatedLead);
      setAppointmentToDelete(null);
    } catch {
      setDeleteError('ลบไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Update Appointment Status
  const handleUpdateAppointmentStatus = async (appointmentId: string, status: AppointmentStatus) => {
    if (!isOperatorOrAdmin) {
      setPermissionError('สิทธิ์ไม่เพียงพอ: เฉพาะ Operator และ Administrator เท่านั้นที่สามารถเปลี่ยนสถานะนัดหมายได้');
      return;
    }
    const target = appointments.find((a) => a.id === appointmentId);
    if (!target) return;

    const linkedLead = leadsList.find(
      (lead) =>
        target.leadId ? target.leadId === lead.id : target.leadName === lead.name
    );

    const updated: B2BAppointment = {
      ...target,
      status,
      updatedAt: localDateKey(),
    };

    if (!linkedLead) {
      const result = await saveCentralB2BAppointment(updated, currentRole);
      if (!result.success) setPermissionError(result.error || 'เปลี่ยนสถานะไม่สำเร็จ');
      return;
    }

    const sourceAppointments = appointments.map((apt) => apt.id === target.id ? updated : apt);
    const nextScheduledAppointment = getScheduledAppointmentForLead(linkedLead, sourceAppointments);
    const updatedLead: B2BLead = {
      ...linkedLead,
      appointmentDate: nextScheduledAppointment?.date,
      appointmentTime: nextScheduledAppointment?.time,
      updatedAt: localDateKey(),
    };

    const result = await saveCentralB2BWorkflow(
      { appointment: updated, lead: updatedLead },
      currentRole
    );
    if (!result.success) {
      setPermissionError(result.error || 'เปลี่ยนสถานะไม่สำเร็จ');
      return;
    }
    if (activeLeadModal?.id === updatedLead.id) setActiveLeadModal(updatedLead);
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
    const result = await resetCentralB2BToDefault(currentRole);
    if (!result.success) { setPermissionError(result.error || 'รีเซ็ตไม่สำเร็จ'); return; }
    setIsResetConfirmOpen(false);
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leadsList.filter((lead) => {
      const offerText = [lead.featuredOffers?.join(' '), lead.offer, lead.proposalOffer, lead.offerDetails].filter(Boolean).join(' ');
      const formatText = [lead.eventType, lead.eventRequirements, lead.format, lead.opportunity].filter(Boolean).join(' ');
      const stageText = getLeadStage(lead);
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
        (lead.contactPerson && lead.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.contactPosition && lead.contactPosition.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.phone && lead.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.lineId && lead.lineId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.baanHomeCoordinatorName && lead.baanHomeCoordinatorName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesPriority =
        selectedPriority === 'All' || lead.priority === selectedPriority;

      const matchesStage =
        selectedStage === 'All' || stageText === selectedStage;

      const matchesOrgType =
        selectedOrgType === 'All' || orgTypeText === selectedOrgType;

      const activeAppointmentsForLead = appointments.filter(
        (apt) =>
          apt.status === 'scheduled' &&
          !apt.salesCycleClosedAt &&
          appointmentBelongsToLead(apt, lead)
      );
      const hasAppointment = activeAppointmentsForLead.length > 0;
      const isReadyForAppointment = stageText === 'ติดต่อแล้ว' && !hasAppointment;

      const matchesAppointment =
        appointmentFilter === 'All' ||
        (appointmentFilter === 'ready' && isReadyForAppointment) ||
        (appointmentFilter === 'hasAppointment' && hasAppointment) ||
        (appointmentFilter === 'noAppointment' && !hasAppointment);

      const matchesOverview =
        overviewFilter === 'All' ||
        (overviewFilter === 'engaged' && ['ติดต่อแล้ว','นัดเข้าพบ','ติดตามต่อ','ส่งใบเสนอราคาแล้ว','ตกลง Partnership'].includes(stageText));

      return matchesSearch && matchesPriority && matchesStage && matchesOrgType && matchesAppointment && matchesOverview;
    });
  }, [leadsList, appointments, searchTerm, selectedPriority, selectedStage, selectedOrgType, appointmentFilter, overviewFilter]);

  const handleUpdateLeadStage = async (leadId: string, newStage: B2BPipelineStatus | string) => {
    if (!isOperatorOrAdmin) {
      setPermissionError('สิทธิ์ไม่เพียงพอ: เฉพาะ Operator และ Administrator เท่านั้นที่สามารถเปลี่ยนสถานะติดตามงานได้');
      return;
    }
    const target = leadsList.find((l) => l.id === leadId);
    if (!target) return;

    const oldStage = getLeadStage(target);
    const isClosure = newStage === 'ปิดการขาย' || newStage === 'ปิดการขายไม่สำเร็จ';
    if (!isClosure && oldStage === newStage) return;

    const now = new Date().toISOString();
    const closure = isClosure
      ? {
          id: `close_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          outcome: newStage === 'ปิดการขาย' ? 'success' as const : 'unsuccessful' as const,
          closedAt: now,
          closedById: actorId,
          closedByName: actorName,
          previousStage: oldStage,
        }
      : null;

    const updatedLead: B2BLead = {
      ...target,
      pipelineStage: isClosure ? 'ยังไม่ติดต่อ' : newStage,
      contactStatus: isClosure ? 'ยังไม่ติดต่อ' : newStage,
      ...(isClosure ? { appointmentDate: undefined, appointmentTime: undefined } : {}),
      ...(closure ? { salesClosures: [...(target.salesClosures || []), closure] } : {}),
      updatedAt: localDateKey(),
      history: [
        {
          id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: now,
          actorId,
          actorName,
          action: isClosure
            ? (newStage === 'ปิดการขาย' ? 'ปิดการขายสำเร็จ' : 'ปิดการขายไม่สำเร็จ')
            : 'เปลี่ยนสถานะการติดตาม',
          changes: isClosure
            ? [
                `ผลรอบการขาย: ${newStage}`,
                `สถานะก่อนปิดรอบ: "${oldStage}"`,
                'เริ่มวงจรใหม่: สถานะปัจจุบัน → "ยังไม่ติดต่อ"',
              ]
            : [`สถานะการติดตาม: "${oldStage}" → "${newStage}"`],
        },
        ...(target.history || []),
      ].slice(0, 100),
    };

    const result = isClosure
      ? await closeCentralB2BSalesCycle(updatedLead, now, currentRole)
      : await saveCentralB2BLead(updatedLead, currentRole);
    if (!result.success) {
      setPermissionError(result.error || 'เปลี่ยนสถานะไม่สำเร็จ');
      return;
    }
    if (activeLeadModal && activeLeadModal.id === leadId) {
      setActiveLeadModal(updatedLead);
    }
  };

  const confirmDeleteClosure = async () => {
    if (!closureToDelete || !isAdmin || isDeleting) return;
    const target = leadsList.find((lead) => lead.id === closureToDelete.leadId);
    if (!target) {
      setClosureToDelete(null);
      return;
    }
    const closure = (target.salesClosures || []).find((item) => item.id === closureToDelete.closureId);
    if (!closure) {
      setClosureToDelete(null);
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const updatedLead: B2BLead = {
        ...target,
        salesClosures: (target.salesClosures || []).filter((item) => item.id !== closure.id),
        updatedAt: localDateKey(),
        history: [
          {
            id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            timestamp: new Date().toISOString(),
            actorId,
            actorName,
            action: 'ลบรอบการขาย',
            changes: [
              `ลบรอบ ${closure.outcome === 'success' ? 'ปิดการขายสำเร็จ' : 'ปิดการขายไม่สำเร็จ'} วันที่ ${closure.closedAt}`,
              'ลบเฉพาะสถิติรอบการขาย ไม่ลบองค์กรและนัดหมาย',
            ],
          },
          ...(target.history || []),
        ].slice(0, 100),
      };
      const result = await saveCentralB2BLead(updatedLead, currentRole);
      if (!result.success) {
        setDeleteError(result.error || 'ลบรอบการขายไม่สำเร็จ');
        return;
      }
      if (activeLeadModal?.id === updatedLead.id) setActiveLeadModal(updatedLead);
      setClosureToDelete(null);
    } catch {
      setDeleteError('ลบรอบการขายไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsDeleting(false);
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

  const directoryStats = useMemo(() => {
    const hasScheduled = (lead: B2BLead) =>
      appointments.some(
        (apt) =>
          apt.status === 'scheduled' &&
          ((apt.leadId && apt.leadId === lead.id) || apt.leadName === lead.name)
      );

    const stageCounts = PIPELINE_STAGES.reduce<Record<string, number>>((acc, item) => {
      acc[item.stage] = leadsList.filter((lead) => getLeadStage(lead) === item.stage).length;
      return acc;
    }, {});

    const withAppointment = leadsList.filter(hasScheduled).length;
    const ready = leadsList.filter(
      (lead) => getLeadStage(lead) === 'ติดต่อแล้ว' && !hasScheduled(lead)
    ).length;

    return {
      total: leadsList.length,
      stageCounts,
      withAppointment,
      withoutAppointment: Math.max(0, leadsList.length - withAppointment),
      ready,
      priorityA: leadsList.filter((lead) => lead.priority === 'A').length,
      priorityB: leadsList.filter((lead) => lead.priority === 'B').length,
      priorityC: leadsList.filter((lead) => lead.priority === 'C').length,
    };
  }, [leadsList, appointments]);

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

      {/* Quick work bar: primary actions first */}
      <div className="bg-white rounded-2xl border border-[#DDE7DC] shadow-sm p-3 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button onClick={() => setActiveSubTab('directory')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap ${activeSubTab==='directory'?'bg-[#1B3E2D] text-white':'bg-[#F5F7F3] text-[#4E6A59]'}`}>
              รายชื่อลูกค้า / หน่วยงาน ({leadsList.length})
            </button>
            <button onClick={() => setActiveSubTab('calendar')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap ${activeSubTab==='calendar'?'bg-[#1B3E2D] text-white':'bg-[#F5F7F3] text-[#4E6A59]'}`}>
              ปฏิทินนัดหมาย ({appointments.filter(a=>a.status==='scheduled').length})
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { setEditingLead(null); setIsAddLeadModalOpen(true); }}
              className="px-3.5 py-2 rounded-xl bg-[#2E7D4E] text-white text-xs font-bold flex items-center gap-1">
              <Plus className="w-4 h-4"/> เพิ่มหน่วยงาน
            </button>
            <button onClick={() => { setEditingApt(null); setAptDefaultDate(localDateKey()); setAptDefaultLead(null); setIsAddAptModalOpen(true); }}
              className="px-3.5 py-2 rounded-xl bg-[#C89B3C] text-[#1E3A29] text-xs font-bold flex items-center gap-1">
              <Calendar className="w-4 h-4"/> เพิ่มนัดหมาย
            </button>
          </div>
        </div>

        {activeSubTab === 'directory' && (
          <div className="relative">
            <Search className="w-4 h-4 text-[#738C7D] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อหน่วยงาน ผู้ติดต่อ เบอร์โทร ประเภทงาน หรือผู้ประสานงาน..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-[#D5E0D2] focus:outline-none focus:ring-2 focus:ring-[#235838] bg-[#FAFBF9]" />
          </div>
        )}
      </div>

      {activeSubTab === 'directory' && (
        <div className="bg-white rounded-2xl border border-[#DDE7DC] p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="text-sm font-bold text-[#183A28]">ภาพรวมงาน B2B</div>
              <div className="text-[11px] text-[#728A7C]">กดตัวเลขเพื่อกรองรายการด้านล่างได้ทันที</div>
            </div>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-[#D9E3D7] text-[#496655] text-xs font-bold flex items-center gap-1.5 hover:bg-[#F6F9F5]"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button type="button"
              onClick={() => {
                setOverviewFilter('All');
                setSelectedPriority('All');
                setSelectedStage('All');
                setAppointmentFilter('All');
                setSearchTerm('');
              }}
              className="text-left rounded-2xl border border-[#DFE6DC] bg-[#FAFBF9] p-3 hover:border-[#2D5A43] transition-all">
              <div className="text-[10px] text-[#6D8276]">ลูกค้าทั้งหมด</div>
              <div className="text-2xl font-bold text-[#173827]">{directoryStats.total}</div>
              <div className="text-[10px] text-[#7A8D81]">หน่วยงาน</div>
            </button>

            <button type="button"
              onClick={() => {
                setOverviewFilter('All');
                setSelectedPriority('All');
                setSelectedStage('ติดต่อแล้ว');
                setAppointmentFilter('All');
              }}
              className={`text-left rounded-2xl border p-3 transition-all ${selectedStage==='ติดต่อแล้ว' ? 'border-lime-400 bg-lime-50 ring-2 ring-lime-100' : 'border-[#DFE6DC] bg-white hover:border-lime-300'}`}>
              <div className="text-[10px] text-lime-700">ติดต่อแล้ว</div>
              <div className="text-2xl font-bold text-lime-700">{directoryStats.stageCounts['ติดต่อแล้ว'] || 0}</div>
              <div className="text-[10px] text-lime-700/70">เจ้า</div>
            </button>

            <button type="button"
              onClick={() => {
                setOverviewFilter('All');
                setSelectedPriority('All');
                setSelectedStage('All');
                setAppointmentFilter('hasAppointment');
              }}
              className={`text-left rounded-2xl border p-3 transition-all ${appointmentFilter==='hasAppointment' ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100' : 'border-[#DFE6DC] bg-white hover:border-blue-300'}`}>
              <div className="text-[10px] text-blue-700">มีนัดแล้ว</div>
              <div className="text-2xl font-bold text-blue-700">{directoryStats.withAppointment}</div>
              <div className="text-[10px] text-blue-700/70">เจ้า</div>
            </button>

            <button type="button"
              onClick={() => {
                setOverviewFilter('All');
                setSelectedPriority('All');
                setSelectedStage('ติดตามต่อ');
                setAppointmentFilter('All');
              }}
              className={`text-left rounded-2xl border p-3 transition-all ${selectedStage==='ติดตามต่อ' ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-100' : 'border-[#DFE6DC] bg-white hover:border-violet-300'}`}>
              <div className="text-[10px] text-violet-700">ติดตามต่อ</div>
              <div className="text-2xl font-bold text-violet-700">{directoryStats.stageCounts['ติดตามต่อ'] || 0}</div>
              <div className="text-[10px] text-violet-700/70">เจ้า</div>
            </button>
          </div>
        </div>
      )}

      {/* 4. TAB CONTENT */}
      {activeSubTab === 'calendar' ? (
        /* CALENDAR VIEW */
        <B2BCalendarView
          appointments={appointments}
          leads={leadsList}
          onAddAppointment={(date) => {
            setEditingApt(null);
            setAptDefaultDate(date || localDateKey());
            setAptDefaultLead(null);
            setIsAddAptModalOpen(true);
          }}
          onEditAppointment={(apt) => {
            setEditingApt(apt);
            setIsAddAptModalOpen(true);
          }}
          onDeleteAppointment={handleDeleteAppointment}
          onUpdateLeadStage={handleUpdateLeadStage}
          onSelectLeadForSearch={onSelectLeadForSearch}
        />
      ) : (
        /* DIRECTORY VIEW */
        <div className="space-y-6">
          <details className="bg-[#FAF9F5] rounded-2xl p-4 border border-[#E2DBD0]">
            <summary className="cursor-pointer text-xs font-bold text-[#7E5C1D]">หน่วยงานแนะนำเร่งด่วน (กดเพื่อดู)</summary>
            <div className="mt-4">
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
          </details>

          {(() => {
            const overdue = leadsList.filter((lead) => getLeadFollowUpAlert(lead));
            return overdue.length > 0 ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span><strong>{overdue.length}</strong> หน่วยงานควรติดตามต่อ</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStage('All'); setOverviewFilter('All');
                    setSearchTerm('');
                  }}
                  className="font-bold text-amber-800 hover:underline whitespace-nowrap"
                >
                  ดูจากป้ายเตือนในรายการ
                </button>
              </div>
            ) : null;
          })()}

          <div className="bg-white rounded-2xl border border-[#E1E8DE] p-3 space-y-2">
            <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1">
              <span className="font-semibold text-[#617B6D] shrink-0">สถานะงาน:</span>
              <button onClick={() => { setSelectedStage('All'); setOverviewFilter('All'); }}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap font-semibold ${selectedStage==='All'?'bg-[#235838] text-white':'bg-[#F5F7F3] text-[#4A6455]'}`}>ทั้งหมด ({directoryStats.total})</button>
              {PIPELINE_STAGES.filter((item) => !['ปิดการขาย','ปิดการขายไม่สำเร็จ'].includes(item.stage)).map((item) => (
                <button key={item.stage} onClick={() => { setSelectedStage(item.stage); setOverviewFilter('All'); }}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap font-semibold border ${
                    selectedStage===item.stage
                      ? item.stage==='ติดตามต่อ' ? 'bg-violet-600 text-white border-violet-600' : 'bg-[#235838] text-white border-[#235838]'
                      : item.stage==='ติดตามต่อ' ? 'bg-violet-50 text-violet-700 border-violet-100' : 'bg-[#F8FAF7] text-[#4A6455] border-[#E5EBE2]'
                  }`}>
                  {item.stage} <span className="opacity-70">({directoryStats.stageCounts[item.stage] || 0})</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1">
              <span className="font-semibold text-[#617B6D] shrink-0">สถานะนัด:</span>
              <button onClick={() => setAppointmentFilter('All')}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap font-semibold ${appointmentFilter==='All'?'bg-[#235838] text-white':'bg-[#F5F7F3] text-[#4A6455]'}`}>ทั้งหมด ({directoryStats.total})</button>
              <button onClick={() => { setAppointmentFilter('ready'); setSelectedStage('ติดต่อแล้ว'); }}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap font-semibold ${appointmentFilter==='ready'?'bg-blue-600 text-white':'bg-blue-50 text-blue-700 border border-blue-100'}`}>พร้อมนัดหมาย ({directoryStats.ready})</button>
              <button onClick={() => setAppointmentFilter('hasAppointment')}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap font-semibold ${appointmentFilter==='hasAppointment'?'bg-emerald-600 text-white':'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>มีนัดแล้ว ({directoryStats.withAppointment})</button>
              <button onClick={() => setAppointmentFilter('noAppointment')}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap font-semibold ${appointmentFilter==='noAppointment'?'bg-slate-600 text-white':'bg-slate-50 text-slate-700 border border-slate-200'}`}>ยังไม่มีนัด ({directoryStats.withoutAppointment})</button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1">
              <span className="font-semibold text-[#617B6D] shrink-0">Priority:</span>
              {(['All','A','B','C'] as const).map((p)=><button key={p} onClick={()=>{ setSelectedPriority(p); setOverviewFilter('All'); }}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap ${selectedPriority===p?'bg-[#235838] text-white':'bg-[#FAF8F2] text-[#4A6455]'}`}>
                {p==='All'
                  ? `ทั้งหมด (${directoryStats.total})`
                  : p==='A'
                  ? `Priority A (${directoryStats.priorityA})`
                  : p==='B'
                  ? `Priority B (${directoryStats.priorityB})`
                  : `Priority C (${directoryStats.priorityC})`}
              </button>)}
              {(searchTerm || selectedPriority !== 'All' || selectedStage !== 'All' || appointmentFilter !== 'All') && (
                <button type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedPriority('All');
                    setSelectedStage('All'); setOverviewFilter('All');
                    setAppointmentFilter('All');
                  }}
                  className="px-2.5 py-1 rounded-lg whitespace-nowrap text-rose-700 bg-rose-50 border border-rose-100 font-semibold">
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>

          {/* Leads Listing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#526D5E] px-1">
              <span>
                พบ <strong>{filteredLeads.length}</strong> หน่วยงาน (จากทั้งหมด {leadsList.length} แห่ง)
                {appointmentFilter === 'ready' && <span className="ml-2 text-blue-700">• ติดต่อแล้วและยังไม่มีนัด</span>}
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
                        🎯 ข้อเสนอจากบ้านโฮม: <strong>{lead.featuredOffers?.length ? lead.featuredOffers.join(', ') : (lead.offer || lead.proposalOffer || 'ยังไม่ระบุ')}</strong>
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
                        {(lead.eventType || lead.eventRequirements || lead.format || lead.opportunity) && (
                          <span className="bg-[#FAF9F5] px-2 py-0.5 rounded border border-[#EDE8DB]">
                            งาน: {lead.eventType || lead.eventRequirements || lead.format || lead.opportunity}
                          </span>
                        )}
                        {(() => {
                          const scheduledAppointment = getScheduledAppointmentForLead(lead);
                          if (!scheduledAppointment) return null;
                          const relativeLabel = getAppointmentRelativeLabel(scheduledAppointment.date);
                          return (
                            <span className={`px-2 py-0.5 rounded font-semibold border ${
                              relativeLabel.startsWith('ผ่านมาแล้ว') || relativeLabel === 'เมื่อวาน'
                                ? 'bg-slate-50 text-slate-700 border-slate-200'
                                : relativeLabel === 'วันนี้'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-[#EEF5EC] text-[#1E7438] border-[#D2E7CE]'
                            }`}>
                              📅 นัด: {scheduledAppointment.date} {scheduledAppointment.time || ''}
                              <span className="ml-1">• {relativeLabel}</span>
                            </span>
                          );
                        })()}
                        {(lead.salesClosures?.length || 0) > 0 && (
                          <>
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold border border-emerald-100">
                              ✓ ปิดสำเร็จ {lead.salesClosures?.filter((item) => item.outcome === 'success').length || 0} ครั้ง
                            </span>
                            {(lead.salesClosures?.filter((item) => item.outcome === 'unsuccessful').length || 0) > 0 && (
                              <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-semibold border border-rose-100">
                                ✕ ไม่สำเร็จ {lead.salesClosures?.filter((item) => item.outcome === 'unsuccessful').length || 0} ครั้ง
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {(() => {
                        const timeline = getCurrentCycleTimeline(lead);
                        if (!timeline.length || getLeadStage(lead) === 'ยังไม่ติดต่อ') return null;
                        return (
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px] pt-1">
                            <span className="font-bold text-[#60766A]">⏱ เส้นทาง:</span>
                            {timeline.map((item, index) => (
                              <React.Fragment key={`${lead.id}-${item.stage}-${index}`}>
                                {index > 0 && <span className="text-[#A8B4AD]">→</span>}
                                <span
                                  className={`px-2 py-0.5 rounded-full border font-semibold ${
                                    item.current
                                      ? item.stage === 'ติดตามต่อ'
                                        ? 'bg-violet-50 text-violet-700 border-violet-200'
                                        : item.stage === 'ส่งใบเสนอราคาแล้ว'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : item.stage === 'นัดเข้าพบ'
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-[#EEF5EC] text-[#2E6543] border-[#D6E7D2]'
                                      : 'bg-slate-50 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {item.stage} {item.days} วัน{item.current ? 'แล้ว' : ''}
                                </span>
                              </React.Fragment>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="sm:max-w-[260px] w-full sm:w-auto space-y-1.5">
                    {(() => {
                      const latest = getLatestLeadActivity(lead);
                      const alert = getLeadFollowUpAlert(lead);
                      return (
                        <>
                          {alert && (
                            <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] font-bold text-amber-800">
                              <AlertCircle className="w-3 h-3" />
                              <span>{alert}</span>
                            </div>
                          )}
                          <div className="text-[10px] text-[#7A8D81]">
                            {latest
                              ? <>อัปเดตล่าสุด {latest.label}{latest.actorName ? ` โดย ${latest.actorName}` : ''}</>
                              : <>ยังไม่มีประวัติการอัปเดต</>}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Quick actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap justify-end">
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                        getLeadStage(lead) === 'ติดต่อแล้ว'
                          ? 'bg-lime-50 text-lime-800 border-lime-200'
                          : getLeadStage(lead) === 'นัดเข้าพบ'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : getLeadStage(lead) === 'ติดตามต่อ'
                          ? 'bg-violet-50 text-violet-800 border-violet-200'
                          : getLeadStage(lead) === 'ส่งใบเสนอราคาแล้ว'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : getLeadStage(lead) === 'ตกลง Partnership'
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : getLeadStage(lead) === 'ปิดการขาย'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {getLeadStage(lead)}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveLeadModal(lead);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-[#F7FAF6] hover:bg-[#EEF5EC] text-[#24563B] border border-[#DEE7DC] text-[11px] font-bold"
                    >
                      ดูข้อมูล
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingApt(null);
                        setAptDefaultLead(lead);
                        setAptDefaultDate(localDateKey());
                        setIsAddAptModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#1B3E2D] hover:bg-[#244F39] text-white text-[11px] font-bold flex items-center gap-1"
                    >
                      <Calendar className="w-3.5 h-3.5" /> ลงนัด
                    </button>

                    <select
                      value={getLeadStage(lead)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleUpdateLeadStage(lead.id, e.target.value);
                      }}
                      className="px-2 py-1.5 rounded-xl border border-[#D5E2D2] bg-white text-[11px] font-bold text-[#345945] max-w-[165px]"
                      title="เลือกสถานะองค์กร"
                    >
                      {!PIPELINE_STAGES.some((item) => item.stage === getLeadStage(lead)) && (
                        <option value={getLeadStage(lead)}>{getLeadStage(lead)} (ข้อมูลเดิม)</option>
                      )}
                      {PIPELINE_STAGES.map((item) => (
                        <option key={item.stage} value={item.stage}>{item.stage}</option>
                      ))}
                    </select>
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

            {(() => {
              const latest = getLatestLeadActivity(activeLeadModal);
              const alert = getLeadFollowUpAlert(activeLeadModal);
              return (
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="text-[#708278]">
                    {latest ? <>อัปเดตล่าสุด {latest.label}{latest.actorName ? ` โดย ${latest.actorName}` : ''}</> : 'ยังไม่มีประวัติการอัปเดต'}
                  </span>
                  {alert && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 font-bold text-amber-800">
                      <AlertCircle className="w-3 h-3" /> {alert}
                    </span>
                  )}
                </div>
              );
            })()}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingApt(null);
                  setAptDefaultLead(activeLeadModal);
                  setAptDefaultDate(localDateKey());
                  setIsAddAptModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#1B3E2D] hover:bg-[#244F39] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4" /> + ลงนัดหมายเพิ่ม
              </button>
              {activeLeadAppointments.filter((apt) => apt.status === 'scheduled').length > 0 && (
                <span className="text-[11px] font-semibold text-[#2E6B45] bg-[#EEF6EB] border border-[#D4E6D0] px-2.5 py-1 rounded-full">
                  มีนัดรอเข้าพบ {activeLeadAppointments.filter((apt) => apt.status === 'scheduled').length} นัด
                </span>
              )}
            </div>

            {/* Customer and BaanHome context */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div className="bg-[#F7FBF5] p-3.5 rounded-2xl border border-[#DDE8DA] space-y-1">
                <span className="text-[#24563B] text-xs font-bold block">ข้อมูลฝั่งลูกค้า / หน่วยงาน</span>
                <p><strong>ผู้ติดต่อ:</strong> {activeLeadModal.contactPerson || 'ยังไม่ระบุ'}</p>
                <p><strong>ตำแหน่ง:</strong> {activeLeadModal.contactPosition || 'ยังไม่ระบุ'}</p>
                <p><strong>โทร:</strong> {activeLeadModal.phone || 'ยังไม่ระบุ'}</p>
                <p><strong>อีเมล / LINE:</strong> {activeLeadModal.email || activeLeadModal.lineId || 'ยังไม่ระบุ'}</p>
                <p><strong>ประเภทงาน:</strong> {activeLeadModal.eventType || 'ยังไม่ระบุ'}</p>
                <p><strong>จำนวนคน:</strong> {activeLeadModal.attendeesEstimate || 'ยังไม่ระบุ'}</p>
                <p><strong>วันที่คาดว่าจะจัดงาน:</strong> {activeLeadModal.eventDate || 'ยังไม่ระบุ'}</p>
              </div>

              <div className="bg-[#FFFCF4] p-3.5 rounded-2xl border border-[#E8E1CD] space-y-1">
                <span className="text-[#735518] text-xs font-bold block">ข้อมูลฝั่งบ้านโฮม</span>
                <p><strong>ผู้ประสานงานบ้านโฮม:</strong> {activeLeadModal.baanHomeCoordinatorName || 'ยังไม่ระบุ'}</p>
                <p><strong>เบอร์ติดต่อ:</strong> {activeLeadModal.baanHomeCoordinatorPhone || 'ยังไม่ระบุ'}</p>
                <p><strong>Priority:</strong> {activeLeadModal.priority}</p>
                <p><strong>สถานะติดตาม:</strong> {getLeadStage(activeLeadModal)}</p>
                <p><strong>ข้อเสนอ:</strong> {activeLeadModal.featuredOffers?.length ? activeLeadModal.featuredOffers.join(', ') : (activeLeadModal.offer || activeLeadModal.proposalOffer || 'ยังไม่ระบุ')}</p>
                <p><strong>ขั้นตอนถัดไป:</strong> {activeLeadModal.nextAction || 'ยังไม่ระบุ'}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E3EAE0] bg-white p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-xs font-bold text-[#315A43]">สรุปรอบการขาย</div>
                  <div className="text-[11px] text-[#718579]">เมื่อปิดรอบ ระบบจะเก็บผลไว้และกลับสถานะปัจจุบันเป็น “ยังไม่ติดต่อ” เพื่อเริ่มรอบใหม่</div>
                </div>
                <div className="flex gap-2 text-[11px] font-bold">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    สำเร็จ {(activeLeadModal.salesClosures || []).filter((item) => item.outcome === 'success').length}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                    ไม่สำเร็จ {(activeLeadModal.salesClosures || []).filter((item) => item.outcome === 'unsuccessful').length}
                  </span>
                </div>
              </div>

              {(activeLeadModal.salesClosures || []).length > 0 && (
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {[...(activeLeadModal.salesClosures || [])].reverse().map((closure, index) => (
                    <div key={closure.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#F8FAF7] border border-[#EDF1EB] px-3 py-2 text-[11px]">
                      <div>
                        <div className={`font-bold ${closure.outcome === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {closure.outcome === 'success' ? 'ปิดการขายสำเร็จ' : 'ปิดการขายไม่สำเร็จ'}
                        </div>
                        <div className="text-[#718579]">
                          {new Date(closure.closedAt).toLocaleString('th-TH')}
                          {closure.closedByName ? ` · โดย ${closure.closedByName}` : ''}
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setClosureToDelete({ leadId: activeLeadModal.id, closureId: closure.id })}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                          title="ลบรอบนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isAdmin && activeLeadModal.history && activeLeadModal.history.length > 0 && (
              <details className="bg-white rounded-2xl border border-[#E3EAE0] p-3.5">
                <summary className="cursor-pointer text-xs font-bold text-[#496655]">
                  ประวัติการแก้ไข ({activeLeadModal.history.length})
                </summary>
                <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activeLeadModal.history.slice(0, 20).map((entry) => (
                    <div key={entry.id} className="rounded-xl bg-[#F8FAF7] border border-[#EDF1EB] p-2.5 text-[11px]">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <strong className="text-[#254B36]">{entry.action}</strong>
                        <span className="text-[#819187]">{new Date(entry.timestamp).toLocaleString('th-TH')}</span>
                      </div>
                      <div className="text-[#6A7D71] mt-0.5">โดย {entry.actorName || 'ไม่ระบุผู้แก้ไข'}</div>
                      <ul className="mt-1 space-y-0.5 text-[#4E6557]">
                        {entry.changes.map((change, idx) => <li key={idx}>• {change}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>
            )}

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

            {/* Manual pipeline + repeat appointments */}
            <div className="pt-3 border-t border-[#EEF3ED] space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-xs font-bold text-[#183A28]">สถานะการติดตาม</div>
                  <div className="text-[11px] text-[#718579]">เลือกสถานะตามสถานการณ์จริง และลงนัดซ้ำได้ทุกเมื่อ</div>
                </div>
                <select
                  value={getLeadStage(activeLeadModal)}
                  onChange={(e) => handleUpdateLeadStage(activeLeadModal.id, e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#D5E2D2] bg-white text-xs font-bold text-[#345945]"
                >
                  {!PIPELINE_STAGES.some((item) => item.stage === getLeadStage(activeLeadModal)) && (
                    <option value={getLeadStage(activeLeadModal)}>{getLeadStage(activeLeadModal)} (ข้อมูลเดิม)</option>
                  )}
                  {PIPELINE_STAGES.map(({ stage }) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
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
        coordinators={coordinators}
        onManageCoordinators={() => setIsCoordinatorManagerOpen(true)}
      />

      <AddAppointmentModal
        key={isAddAptModalOpen ? (editingApt?.id || aptDefaultDate || 'new') : 'closed'}
        isOpen={isAddAptModalOpen}
        onClose={() => setIsAddAptModalOpen(false)}
        onSave={handleSaveAppointment}
        onReschedule={handleRescheduleAppointment}
        onComplete={handleCompleteAppointment}
        onCancelAppointment={handleCancelAppointment}
        onUpdateLeadStage={handleUpdateLeadStage}
        leads={leadsList}
        editAppointment={editingApt}
        defaultDate={aptDefaultDate}
        defaultLead={aptDefaultLead}
        onEditLead={(lead) => {
          setIsAddAptModalOpen(false);
          setEditingLead(lead);
          setIsAddLeadModalOpen(true);
        }}
      />

      <B2BCoordinatorManagerModal
        isOpen={isCoordinatorManagerOpen}
        onClose={() => setIsCoordinatorManagerOpen(false)}
        coordinators={coordinators}
        role={currentRole}
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
                disabled={isDeleting}
                onClick={() => setAppointmentToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteAppointment}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'กำลังลบ…' : 'ยืนยันลบนัดหมาย'}</span>
              </button>
            </div>
            {deleteError && <p role="alert" className="text-sm text-red-600">{deleteError}</p>}
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
                  ผู้ติดต่อฝั่งลูกค้า: {leadToDelete.contactPerson}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setLeadToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteLead}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'กำลังลบ…' : 'ยืนยันการลบ'}</span>
              </button>
            </div>
            {deleteError && <p role="alert" className="text-sm text-red-600">{deleteError}</p>}
          </div>
        </div>
      )}

      {closureToDelete && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm sm:max-w-md w-full shadow-2xl border border-red-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-[#1F3E2D]">ลบรอบการขายนี้?</h3>
              <p className="text-xs text-[#527060]">เฉพาะ Administrator เท่านั้น การลบจะกระทบเฉพาะสถิติรอบนี้ ไม่ลบองค์กรและไม่นัดหมายเดิม</p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button type="button" disabled={isDeleting} onClick={() => setClosureToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold">
                ยกเลิก
              </button>
              <button type="button" disabled={isDeleting} onClick={confirmDeleteClosure}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold flex items-center justify-center gap-1.5">
                <Trash2 className="w-4 h-4" /> {isDeleting ? 'กำลังลบ…' : 'ยืนยันลบรอบ'}
              </button>
            </div>
            {deleteError && <p role="alert" className="text-sm text-red-600">{deleteError}</p>}
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
