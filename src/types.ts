export type KnowledgeCategory =
  | 'business-profile'
  | 'restaurant'
  | 'resort-knowledge'
  | 'pool-villa'
  | 'mini-mice'
  | 'promotion-package'
  | 'customer-service'
  | 'reservation'
  | 'sop-operation'
  | 'faq-problems'
  | 'kc-corporation'
  | 'employee-welfare'
  | 'competitor-battlecard'
  | 'quotation-policy';

export interface CategoryMeta {
  id: KnowledgeCategory;
  nameTh: string;
  nameEn: string;
  description: string;
  icon: string;
  docCount: number;
  googleDocName: string;
}

export type AudienceType = 'Both' | 'Employee' | 'Customer';
export type DataStatusType = 'Confirmed' | 'Partial' | 'Conflict' | 'Missing' | 'Historical' | 'Planned';

export interface CompetitorComparisonData {
  competitorName: string;
  competitorType?: string; // คู่แข่งตรง, คู่แข่ง Scale ใหญ่, ฯลฯ
  location?: string;
  capacityComp?: string;
  pricingComp?: string;
  atmosphereComp?: string;
  facilityComp?: string;
  bhSweetSpot?: string;
  salesPitch?: string;
  guardrails?: string[];
  mysteryShoppingStatus?: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  category: KnowledgeCategory;
  audience?: AudienceType;
  keywords: string[];
  summary: string;
  detail: string[];
  customerMessage: string;
  nextActions: string[];
  sourceDoc: string;
  docSection?: string;
  lastUpdated: string;
  status?: 'Published' | 'Draft' | 'Internal' | 'Review' | 'Archived';
  dataStatus?: DataStatusType;
  aiUsable?: 'Yes' | 'Employee Only';
  startDate?: string;
  endDate?: string;
  isCompetitorBattlecard?: boolean;
  competitorData?: CompetitorComparisonData;
  imageUrl?: string;
  images?: string[];
}

export type B2BPipelineStatus =
  | 'ยังไม่ติดต่อ'
  | 'ติดต่อแล้ว'
  | 'นัดเข้าพบ'
  | 'ติดตามต่อ'
  | 'ส่งใบเสนอราคาแล้ว'
  | 'ตกลง Partnership'
  | 'ปิดการขาย'
  | 'ปิดการขายไม่สำเร็จ';

export interface B2BLeadHistoryEntry {
  id: string;
  timestamp: string;
  actorId?: string;
  actorName?: string;
  action: string;
  changes: string[];
}

export interface B2BSalesClosure {
  id: string;
  outcome: 'success' | 'unsuccessful';
  closedAt: string;
  closedById?: string;
  closedByName?: string;
  previousStage?: string;
}

export interface B2BLead {
  id: string;
  _revision?: number; // server-managed optimistic concurrency revision // e.g. KH-168
  name: string; // e.g. สำนักงานพัฒนาฝีมือแรงงานกาฬสินธุ์
  priority: 'A' | 'B' | 'C';
  categoryType?: string; // Training / Government, University, Education, Hospital, etc.
  cooperationType?: string; // Recommended Venue, Corporate Account, etc.
  reasonsToApproach?: string; // เหตุผลที่ควรเข้า
  opportunity?: string; // โอกาส / รูปแบบงาน
  proposalOffer?: string; // ข้อเสนอที่ควรเสนอ
  contactStatus?: B2BPipelineStatus | string;
  sourceUrl?: string;
  notes?: string;
  nextAction?: string;
  recommendedRank?: number; // 1 to 5 for top recommended targets
  // UI helper properties & aliases
  offer?: string;
  format?: string;
  pipelineStage?: B2BPipelineStatus | string;
  orgType?: string;
  contactPerson?: string; // ชื่อผู้ติดต่อฝั่งลูกค้า
  contactPosition?: string; // ตำแหน่งผู้ติดต่อฝั่งลูกค้า
  phone?: string;
  email?: string; // อีเมล / LINE
  lineId?: string;
  address?: string;
  district?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentNotes?: string;
  estimatedBudget?: string;
  attendeesEstimate?: number;
  eventType?: '' | 'ประชุม' | 'จัดเลี้ยง' | 'สัมมนา';
  eventDate?: string; // วันที่ลูกค้าคาดว่าจะจัดงาน (ไม่ใช่วันนัดเข้าพบ)
  eventRequirements?: string;
  baanHomeCoordinatorId?: string;
  baanHomeCoordinatorName?: string;
  baanHomeCoordinatorPhone?: string;
  featuredOffers?: string[];
  offerDetails?: string;
  legacyEventTypeText?: string;
  legacyOfferText?: string;
  lastContactDate?: string;
  updatedAt?: string;
  isCustom?: boolean; // true if added by user
  history?: B2BLeadHistoryEntry[];
  salesClosures?: B2BSalesClosure[];
}

export interface B2BCoordinator {
  id: string;
  name: string;
  phone?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'not_met' | 'rescheduled' | 'cancelled';

export interface AppointmentRescheduleEntry {
  id: string;
  fromDate: string;
  fromTime: string;
  toDate: string;
  toTime: string;
  reason?: string;
  changedAt: string;
  changedById?: string;
  changedByName?: string;
}

export interface B2BAppointment {
  id: string;
  _revision?: number; // server-managed optimistic concurrency revision
  leadId?: string;
  leadName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  title: string;
  location: string; // e.g. "บ้านโฮม สวนอาหาร&รีสอร์ท (ห้อง VIP 1)" or "ที่ทำการหน่วยงานเป้าหมาย"
  contactPerson?: string;
  phone?: string;
  attendeesCount?: number;
  objective:
    | 'นำเสนอแพ็กเกจห้องประชุม & Corporate Rate'
    | 'ชิมอาหาร & สำรวจสถานที่จริง (Site Visit)'
    | 'ส่งใบเสนอราคา & ลงนามข้อตกลง'
    | 'ประสานงานจัดงานจริง & เตรียมห้อง'
    | 'ติดตามผลงานอบรม & สานสัมพันธ์'
    | 'อื่นๆ';
  status: AppointmentStatus;
  notes?: string;
  resultNote?: string;
  cancelReason?: string;
  completedAt?: string;
  cancelledAt?: string;
  rescheduleHistory?: AppointmentRescheduleEntry[];
  assignedStaff?: string;
  priority?: 'A' | 'B' | 'C';
  createdAt: string;
  updatedAt?: string;
}

export type Department = string;

export interface DepartmentItem {
  id: string;
  name: string;
  code?: string;
  description?: string;
  icon?: string;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type UserRole = 'Knowledge User' | 'Operator' | 'Administrator';

export type UserStatus = 'active' | 'inactive';

export interface StaffProfile {
  id: string;
  username: string;
  name: string;
  department: Department;
  avatar: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: string;
}

export interface AppUser {
  id: string;
  username: string;
  name: string;
  department: Department;
  role: UserRole;
  status: UserStatus;
  avatar: string;
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
  lastPasswordResetAt?: string;
}

export type UserActivityAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'SEARCH_QA'
  | 'VIEW_DOC'
  | 'VIEW_B2B'
  | 'UPDATE_B2B'
  | 'UPDATE_UNANSWERED'
  | 'SYNC_SHEETS'
  | 'ADMIN_CREATE_USER'
  | 'ADMIN_EDIT_USER'
  | 'ADMIN_CHANGE_ROLE'
  | 'ADMIN_TOGGLE_STATUS'
  | 'ADMIN_RESET_PASSWORD'
  | 'ADMIN_DELETE_USER'
  | 'ADMIN_CREATE_DEPT'
  | 'ADMIN_EDIT_DEPT'
  | 'ADMIN_DELETE_DEPT';

export interface UserActivityLog {
  id: string;
  userId: string;
  username: string;
  staffName: string;
  role: UserRole | string;
  action: UserActivityAction | string;
  details: string;
  timestamp: string;
}

export type FeedbackType = 'accurate' | 'incomplete' | 'incorrect';

export interface QuestionLog {
  id: string;
  timestamp: string;
  staffName: string;
  department: string;
  question: string;
  answerSummary: string;
  category: string;
  sourceDoc: string;
  found: boolean;
  feedback?: FeedbackType;
  feedbackNote?: string;
}

export interface UnansweredQuestion {
  id: string;
  timestamp: string;
  staffName: string;
  department: string;
  question: string;
  status: 'pending' | 'assigned' | 'resolved';
  suggestedCategory?: KnowledgeCategory;
  targetDoc?: string;
  adminNotes?: string;
}
