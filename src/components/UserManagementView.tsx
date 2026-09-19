import React, { useState, useMemo, useEffect } from 'react';
import { 
  AppUser, 
  StaffProfile, 
  UserRole, 
  UserStatus, 
  UserActivityLog, 
  Department,
  DepartmentItem
} from '../types';
import { 
  createNewUser, 
  updateUserRole, 
  toggleUserStatus, 
  resetUserPassword, 
  updateUserProfile,
  deleteUser,
  exportUsersToCSV,
  exportActivityLogsToCSV,
  ROLE_PERMISSIONS,
  batchUpdateUsersDepartment
} from '../utils/authService';
import {
  getLocalDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  subscribeDepartments,
  initializeDepartmentsIfNeeded,
  resetDepartmentsToDefault
} from '../utils/departmentService';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Key, 
  Lock, 
  Power, 
  RefreshCw, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Building2, 
  History, 
  EyeOff, 
  Copy, 
  Check, 
  X, 
  UserCog,
  Edit3,
  Trash2,
  Download,
  Table,
  CheckCircle,
  XCircle,
  FileText,
  Info
} from 'lucide-react';

interface UserManagementViewProps {
  currentUser: StaffProfile;
  users: AppUser[];
  activityLogs: UserActivityLog[];
  onRefreshUsers?: () => void;
}

const DEFAULT_DEPARTMENTS = getLocalDepartments().map((d) => d.name);

const PERMISSION_MATRIX_DATA = [
  {
    feature: '1. ค้นหาคำถาม-คำตอบ น้องโฮม (QA Search)',
    kuser: true,
    operator: true,
    admin: true,
    note: 'ค้นหาข้อมูลด่วนเกี่ยวกับห้องพัก ร้านอาหาร สัมมนา และนโยบายรีสอร์ท',
  },
  {
    feature: '2. ฐานความรู้ Google Docs 12 หมวดหมู่',
    kuser: true,
    operator: true,
    admin: true,
    note: 'ศึกษาโครงสร้างเนื้อหาคู่มือปฏิบัติงาน SOP ของรีสอร์ททั้ง 12 หมวด',
  },
  {
    feature: '3. แคตตาล็อกบริการและคำถามแนะนำ (Service Showcase)',
    kuser: true,
    operator: true,
    admin: true,
    note: 'สำรวจบริการ 8 ประเภท และคลิกคำถามแนะนำยอดนิยมเพื่อค้นหาได้ทันที',
  },
  {
    feature: '4. ส่งข้อเสนอแนะความถูกต้องของคำตอบ (Feedback)',
    kuser: true,
    operator: true,
    admin: true,
    note: 'กดให้คะแนน ถูกต้อง / ตกหล่น / ไม่ถูกต้อง เพื่อพัฒนาฐานความรู้',
  },
  {
    feature: '5. ฐานข้อมูลลูกค้าองค์กรและพันธมิตร B2B (101 แห่ง)',
    kuser: false,
    operator: true,
    admin: true,
    note: 'ค้นหาหน่วยงานราชการ สถาบันการศึกษา และบริษัทเอกชนเป้าหมาย',
  },
  {
    feature: '6. ตารางปฏิทินนัดหมายและบันทึกข้อตกลง B2B',
    kuser: false,
    operator: true,
    admin: true,
    note: 'เพิ่มและอัปเดตนัดหมาย ชิมอาหาร ส่งใบเสนอราคา และข้อตกลง Corporate Rate',
  },
  {
    feature: '7. ประวัติ Google Sheets Log & การซิงค์ข้อมูล',
    kuser: false,
    operator: true,
    admin: true,
    note: 'ดูสถิติการค้นหาของพนักงาน, ลบประวัติ, และนำเข้าไฟล์ CSV/Sheets ใหม่',
  },
  {
    feature: '8. จัดการคิวคำถามที่ตอบไม่ได้ (Unanswered Questions)',
    kuser: false,
    operator: true,
    admin: true,
    note: 'ติดตามคำถามที่ค้นไม่พบ มอบหมายผู้ตอบ และอัปเดตสถานะเป็นตอบแล้ว',
  },
  {
    feature: '9. เพิ่มบัญชีผู้ใช้พนักงานใหม่ (Create User)',
    kuser: false,
    operator: false,
    admin: true,
    note: 'สร้าง Username, แผนก, กำหนด Role แรกเข้า และรหัสผ่านเริ่มต้น',
  },
  {
    feature: '10. แก้ไขข้อมูลพนักงาน (Edit Profile)',
    kuser: false,
    operator: false,
    admin: true,
    note: 'เปลี่ยนชื่อ-สกุล แผนกประจำ หรือไอคอนประจำตัวของพนักงาน',
  },
  {
    feature: '11. เปลี่ยนระดับสิทธิ์พนักงาน (Change Role)',
    kuser: false,
    operator: false,
    admin: true,
    note: 'ปรับสิทธิ์ระหว่าง Knowledge User, Operator และ Administrator',
  },
  {
    feature: '12. ระงับ / เปิดใช้งานบัญชี (Toggle Status)',
    kuser: false,
    operator: false,
    admin: true,
    note: 'ปิดกั้นการเข้าสู่ระบบกรณีพนักงานลาออกหรือพักงานชั่วคราว',
  },
  {
    feature: '13. รีเซ็ตรหัสผ่านพนักงาน (Reset Password)',
    kuser: false,
    operator: false,
    admin: true,
    note: 'สร้างรหัสชั่วคราวใหม่ เข้ารหัส SHA-256 ป้องกันการอ่าน Plaintext',
  },
  {
    feature: '14. ลบบัญชีผู้ใช้ (Delete User)',
    kuser: false,
    operator: false,
    admin: true,
    note: 'ลบบัญชีพนักงานที่ไม่ได้ใช้งาน พร้อมระบบยืนยันความปลอดภัย (ห้ามลบตัวเอง)',
  },
  {
    feature: '15. บันทึกและตรวจสอบ Audit Logs ความปลอดภัย',
    kuser: false,
    operator: false,
    admin: true,
    note: 'ตรวจสอบประวัติกิจกรรมการใช้งาน บัญชีผู้กระทำ และเวลาแบบ Real-time',
  },
  {
    feature: '16. สถาปัตยกรรมระบบ (Architecture Design View)',
    kuser: false,
    operator: false,
    admin: true,
    note: 'ตรวจสอบแผนผังการเชื่อมต่อ Google Docs, Sheets, และ Firestore Database',
  },
];

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentUser,
  users,
  activityLogs,
  onRefreshUsers,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'departments' | 'matrix' | 'activity'>('users');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Dynamic Departments State
  const [departments, setDepartments] = useState<DepartmentItem[]>(() => getLocalDepartments());
  const [deptSearchText, setDeptSearchText] = useState('');

  // Add Department Modal State
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [addDeptError, setAddDeptError] = useState('');
  const [isSubmittingAddDept, setIsSubmittingAddDept] = useState(false);

  // Edit Department Modal State
  const [editDeptModalItem, setEditDeptModalItem] = useState<DepartmentItem | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptCode, setEditDeptCode] = useState('');
  const [editDeptDesc, setEditDeptDesc] = useState('');
  const [editDeptMigrateUsers, setEditDeptMigrateUsers] = useState(true);
  const [editDeptError, setEditDeptError] = useState('');
  const [isSubmittingEditDept, setIsSubmittingEditDept] = useState(false);

  // Delete Department Modal State
  const [deleteDeptModalItem, setDeleteDeptModalItem] = useState<DepartmentItem | null>(null);
  const [deleteDeptTargetDept, setDeleteDeptTargetDept] = useState('');
  const [deleteDeptError, setDeleteDeptError] = useState('');
  const [isSubmittingDeleteDept, setIsSubmittingDeleteDept] = useState(false);

  useEffect(() => {
    initializeDepartmentsIfNeeded();
    const unsub = subscribeDepartments((depts) => {
      setDepartments(depts);
    });
    return () => unsub();
  }, []);

  // Search & Filters for Users
  const [userSearchText, setUserSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<Department | 'all'>('all');

  // Search & Filters for Activity Logs
  const [activitySearchText, setActivitySearchText] = useState('');
  const [activityUserFilter, setActivityUserFilter] = useState<string>('all');
  const [activityActionFilter, setActivityActionFilter] = useState<string>('all');

  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newDepartment, setNewDepartment] = useState<Department>('ต้อนรับส่วนหน้า (Front Office)');
  const [newRole, setNewRole] = useState<UserRole>('Knowledge User');
  const [newPassword, setNewPassword] = useState('');
  const [newAvatar, setNewAvatar] = useState('👩🏻‍💼');
  const [addError, setAddError] = useState('');
  const [addSuccessMsg, setAddSuccessMsg] = useState('');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Edit User Profile Modal State
  const [editModalUser, setEditModalUser] = useState<AppUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState<Department>('ต้อนรับส่วนหน้า (Front Office)');
  const [editAvatar, setEditAvatar] = useState('👩🏻‍💼');
  const [editError, setEditError] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Reset Password Modal State
  const [resetModalUser, setResetModalUser] = useState<AppUser | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Change Role Modal State
  const [roleModalUser, setRoleModalUser] = useState<AppUser | null>(null);
  const [targetRole, setTargetRole] = useState<UserRole>('Knowledge User');

  // Delete User Confirmation Modal State
  const [deleteModalUser, setDeleteModalUser] = useState<AppUser | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Generic In-App Confirmation Modal (replacing window.confirm)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'ยืนยัน',
    onConfirm: () => {},
  });

  // High-visibility Toast Notification (Top Center, z-[99999])
  const [toast, setToast] = useState<{
    id: number;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // In-Page Action Alert Banner (Immediate visual feedback inside view)
  const [actionAlert, setActionAlert] = useState<{
    id: number;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (title: string, messageOrType?: string, maybeType?: 'success' | 'error' | 'info') => {
    let type: 'success' | 'error' | 'info' = 'success';
    let message = '';
    if (maybeType) {
      type = maybeType;
      message = messageOrType || '';
    } else if (messageOrType === 'success' || messageOrType === 'error' || messageOrType === 'info') {
      type = messageOrType;
    } else if (messageOrType) {
      message = messageOrType;
    }
    const id = Date.now();
    setToast({ id, title, message, type });
    setTimeout(() => {
      setToast((prev) => (prev && prev.id === id ? null : prev));
    }, 5000);
  };

  const triggerAlertBanner = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setActionAlert({ id, title, message, type });
    setTimeout(() => {
      setActionAlert((prev) => (prev && prev.id === id ? null : prev));
    }, 8000);
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    if (onRefreshUsers) {
      onRefreshUsers();
    }
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('รีเฟรชข้อมูลสำเร็จ', 'อัปเดตรายชื่อและสถานะล่าสุดเรียบร้อยแล้ว', 'success');
    }, 500);
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(userSearchText.toLowerCase()) ||
        u.username.toLowerCase().includes(userSearchText.toLowerCase()) ||
        u.department.toLowerCase().includes(userSearchText.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
      const matchesDept = departmentFilter === 'all' || u.department === departmentFilter;
      return matchesSearch && matchesRole && matchesStatus && matchesDept;
    });
  }, [users, userSearchText, roleFilter, statusFilter, departmentFilter]);

  // Filtered Activity Logs
  const filteredActivities = useMemo(() => {
    return activityLogs.filter((log) => {
      const matchesSearch =
        log.details.toLowerCase().includes(activitySearchText.toLowerCase()) ||
        log.staffName.toLowerCase().includes(activitySearchText.toLowerCase()) ||
        log.username.toLowerCase().includes(activitySearchText.toLowerCase());
      const matchesUser = activityUserFilter === 'all' || log.username === activityUserFilter;
      const matchesAction = activityActionFilter === 'all' || log.action === activityActionFilter;
      return matchesSearch && matchesUser && matchesAction;
    });
  }, [activityLogs, activitySearchText, activityUserFilter, activityActionFilter]);

  // Unique usernames for activity filter
  const uniqueUsersInLogs = useMemo(() => {
    const map = new Map<string, string>();
    activityLogs.forEach((l) => {
      if (l.username) map.set(l.username, `${l.staffName} (@${l.username})`);
    });
    return Array.from(map.entries());
  }, [activityLogs]);

  // Random Password Generator
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Submit Add User
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccessMsg('');

    const targetUsername = newUsername.trim().toLowerCase();
    const targetName = newName.trim();
    const targetPassword = newPassword.trim();
    const targetDept = newDepartment;
    const targetRoleName = newRole;

    if (!targetUsername || targetUsername.length < 3) {
      setAddError('ชื่อผู้ใช้ (Username) ต้องมีความยาวอย่างน้อย 3 ตัวอักษร');
      return;
    }
    if (!targetName) {
      setAddError('กรุณาระบุชื่อ-นามสกุล หรือชื่อเล่นพนักงาน');
      return;
    }
    if (!targetPassword || targetPassword.length < 6) {
      setAddError('รหัสผ่านเริ่มต้นต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    try {
      setIsSubmittingAdd(true);
      await createNewUser(
        {
          username: targetUsername,
          name: targetName,
          department: targetDept,
          role: targetRoleName,
          plainPassword: targetPassword,
          avatar: newAvatar,
        },
        currentUser
      );

      // Close modal immediately so the user is not waiting
      setIsAddUserModalOpen(false);
      setNewUsername('');
      setNewName('');
      setNewPassword('');
      setAddError('');
      setAddSuccessMsg('');

      // High-visibility Toast Notification (Top Center, z-[99999])
      showToast(
        'บันทึกบัญชีผู้ใช้สำเร็จ!',
        `เพิ่มบัญชี @${targetUsername} (${targetName}) เรียบร้อยแล้ว`,
        'success'
      );

      // In-page Banner Confirmation
      triggerAlertBanner(
        'บันทึกบัญชีผู้ใช้ใหม่สำเร็จ',
        `เพิ่มบัญชี @${targetUsername} (${targetName}) แผนก ${targetDept.split(' ')[0]} สิทธิ์ [${targetRoleName}] เรียบร้อยแล้ว สามารถเข้าใช้งานได้ทันที`,
        'success'
      );

      if (onRefreshUsers) onRefreshUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถสร้างบัญชีได้';
      setAddError(msg);
      showToast('เกิดข้อผิดพลาดในการบันทึก', msg, 'error');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Open Edit User Profile Modal
  const openEditUserModal = (user: AppUser) => {
    setEditModalUser(user);
    setEditName(user.name);
    setEditDepartment(user.department);
    setEditAvatar(user.avatar || '🧑🏻‍💼');
    setEditError('');
  };

  // Submit Edit User Profile
  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalUser) return;
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError('กรุณาระบุชื่อ-สกุลหรือชื่อเล่น');
      return;
    }

    try {
      setIsSubmittingEdit(true);
      const targetUser = editModalUser;
      await updateUserProfile(
        targetUser.id,
        {
          name: trimmedName,
          department: editDepartment,
          avatar: editAvatar,
        },
        currentUser
      );

      setEditModalUser(null);
      showToast('บันทึกข้อมูลสำเร็จ!', `อัปเดตข้อมูล @${targetUser.username} (${trimmedName}) เรียบร้อยแล้ว`, 'success');
      triggerAlertBanner(
        'อัปเดตข้อมูลพนักงานสำเร็จ',
        `แก้ไขข้อมูล @${targetUser.username}: ชื่อ "${trimmedName}", แผนก "${editDepartment}" เรียบร้อยแล้ว`,
        'success'
      );
      if (onRefreshUsers) onRefreshUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถแก้ไขข้อมูลได้';
      setEditError(msg);
      showToast('เกิดข้อผิดพลาดในการแก้ไข', msg, 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Toggle User Status (with in-app Confirmation Dialog)
  const handleToggleStatus = (user: AppUser) => {
    if (user.id === currentUser.id) {
      showToast('ไม่สามารถระงับบัญชีตนเอง', 'คุณไม่สามารถปิดการใช้งานบัญชีของตนเองได้', 'error');
      return;
    }

    const nextStatus: UserStatus = user.status === 'active' ? 'inactive' : 'active';
    const isDeactivating = nextStatus === 'inactive';

    setConfirmDialog({
      isOpen: true,
      title: isDeactivating ? 'ยืนยันการระงับบัญชีผู้ใช้' : 'เปิดใช้งานบัญชีผู้ใช้',
      message: isDeactivating
        ? `ต้องการระงับการใช้งานบัญชี @${user.username} (${user.name}) ใช่หรือไม่? ผู้ใช้นี้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง`
        : `ต้องการเปิดใช้งานบัญชี @${user.username} (${user.name}) อีกครั้งใช่หรือไม่?`,
      confirmText: isDeactivating ? 'ระงับบัญชี' : 'เปิดใช้งาน',
      isDestructive: isDeactivating,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await toggleUserStatus(user.id, nextStatus, currentUser);
          const statusText = isDeactivating ? 'ระงับบัญชี' : 'เปิดใช้งานบัญชี';
          showToast(`${statusText}เรียบร้อยแล้ว`, `@${user.username} (${user.name})`, isDeactivating ? 'info' : 'success');
          triggerAlertBanner(
            `${statusText}สำเร็จ`,
            `เปลี่ยนสถานะบัญชี @${user.username} (${user.name}) เป็น [${nextStatus}] เรียบร้อยแล้ว`,
            isDeactivating ? 'info' : 'success'
          );
          if (onRefreshUsers) onRefreshUsers();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ';
          showToast('เกิดข้อผิดพลาด', msg, 'error');
        }
      },
    });
  };

  // Open Reset Password
  const openResetPasswordModal = (user: AppUser) => {
    setResetModalUser(user);
    setTempPassword(generateRandomPassword());
    setResetError('');
    setResetSuccessMsg('');
    setCopiedPassword(false);
  };

  // Submit Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    const trimmedPw = tempPassword.trim();
    if (!trimmedPw || trimmedPw.length < 6) {
      setResetError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    try {
      setIsSubmittingReset(true);
      const targetUser = resetModalUser;
      await resetUserPassword(targetUser.id, trimmedPw, currentUser);
      setResetSuccessMsg(`รีเซ็ตรหัสผ่านสำหรับ @${targetUser.username} สำเร็จ!`);
      showToast(
        'รีเซ็ตรหัสผ่านสำเร็จ!',
        `รหัสผ่านใหม่สำหรับ @${targetUser.username} บันทึกเรียบร้อยแล้ว`,
        'success'
      );
      triggerAlertBanner(
        'รีเซ็ตรหัสผ่านสำเร็จ',
        `รีเซ็ตรหัสผ่านใหม่สำหรับ @${targetUser.username} (${targetUser.name}) เรียบร้อยแล้ว (รหัสผ่านถูกเข้ารหัส SHA-256)`,
        'success'
      );
      if (onRefreshUsers) onRefreshUsers();
      setTimeout(() => {
        setResetModalUser(null);
        setResetSuccessMsg('');
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถรีเซ็ตรหัสผ่านได้';
      setResetError(msg);
      showToast('ไม่สามารถรีเซ็ตรหัสผ่านได้', msg, 'error');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Open Change Role
  const openChangeRoleModal = (user: AppUser) => {
    setRoleModalUser(user);
    setTargetRole(user.role);
  };

  // Submit Change Role (with in-app warning if self-demotion)
  const handleChangeRoleSubmit = async () => {
    if (!roleModalUser) return;
    if (roleModalUser.id === currentUser.id && targetRole !== 'Administrator') {
      setConfirmDialog({
        isOpen: true,
        title: 'คำเตือน: ลดระดับสิทธิ์ตนเอง',
        message: 'คุณกำลังจะลดระดับสิทธิ์ของตนเอง หากลดระดับแล้วคุณจะไม่สามารถเข้าถึงหน้าจัดการผู้ใช้นี้ได้ ต้องการดำเนินการต่อหรือไม่?',
        confirmText: 'ยืนยันลดสิทธิ์',
        isDestructive: true,
        onConfirm: async () => {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          await executeChangeRole();
        },
      });
      return;
    }

    await executeChangeRole();
  };

  const executeChangeRole = async () => {
    if (!roleModalUser) return;
    const targetUser = roleModalUser;
    const newRoleTarget = targetRole;
    try {
      await updateUserRole(targetUser.id, newRoleTarget, currentUser);
      showToast(
        'เปลี่ยนระดับสิทธิ์สำเร็จ!',
        `เปลี่ยนสิทธิ์ @${targetUser.username} เป็น [${newRoleTarget}] เรียบร้อยแล้ว`,
        'success'
      );
      triggerAlertBanner(
        'เปลี่ยนระดับสิทธิ์สำเร็จ',
        `อัปเดตสิทธิ์ของ @${targetUser.username} (${targetUser.name}) เป็น [${newRoleTarget}] เรียบร้อยแล้ว`,
        'success'
      );
      if (onRefreshUsers) onRefreshUsers();
      setRoleModalUser(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถเปลี่ยนสิทธิ์ได้';
      showToast('ไม่สามารถเปลี่ยนสิทธิ์ได้', msg, 'error');
    }
  };

  // Open Delete User Modal
  const openDeleteModal = (user: AppUser) => {
    if (user.id === currentUser.id) {
      showToast('ไม่สามารถลบบัญชีตนเอง', 'คุณไม่สามารถลบบัญชีของตนเองได้', 'error');
      return;
    }
    setDeleteModalUser(user);
    setDeleteConfirmationInput('');
    setDeleteError('');
  };

  // Submit Delete User
  const handleDeleteUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteModalUser) return;

    if (deleteConfirmationInput.trim().toLowerCase() !== deleteModalUser.username.toLowerCase()) {
      setDeleteError(`กรุณาพิมพ์ "${deleteModalUser.username}" ให้ตรงกันเพื่อยืนยันการลบ`);
      return;
    }

    try {
      setIsSubmittingDelete(true);
      const targetUser = deleteModalUser;
      await deleteUser(targetUser.id, currentUser);
      showToast(
        'ลบบัญชีผู้ใช้เรียบร้อย',
        `ลบบัญชีผู้ใช้ @${targetUser.username} (${targetUser.name}) ออกจากระบบแล้ว`,
        'info'
      );
      triggerAlertBanner(
        'ลบบัญชีผู้ใช้สำเร็จ',
        `ลบบัญชี @${targetUser.username} (${targetUser.name}) ออกจากระบบเรียบร้อยแล้ว`,
        'info'
      );
      if (onRefreshUsers) onRefreshUsers();
      setDeleteModalUser(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถลบบัญชีได้';
      setDeleteError(msg);
      showToast('ไม่สามารถลบบัญชีได้', msg, 'error');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Helper to count users in a department
  const getDeptUserCount = (deptName: string) => {
    return users.filter((u) => u.department === deptName).length;
  };

  // Add Department Submit
  const handleAddDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddDeptError('');
    const trimmedDeptName = newDeptName.trim();
    if (!trimmedDeptName) {
      setAddDeptError('กรุณาระบุชื่อแผนก');
      return;
    }
    setIsSubmittingAddDept(true);
    try {
      const res = await createDepartment(trimmedDeptName, newDeptDesc, newDeptCode);
      if (!res.success) {
        setAddDeptError(res.error || 'ไม่สามารถเพิ่มแผนกได้');
      } else {
        setIsAddDeptModalOpen(false);
        setNewDeptName('');
        setNewDeptCode('');
        setNewDeptDesc('');
        showToast('เพิ่มแผนกสำเร็จ!', `สร้างแผนก "${trimmedDeptName}" เรียบร้อยแล้ว`, 'success');
        triggerAlertBanner(
          'เพิ่มแผนกใหม่สำเร็จ',
          `สร้างแผนก "${trimmedDeptName}" ในโครงสร้างองค์กรเรียบร้อยแล้ว`,
          'success'
        );
      }
    } catch (err: unknown) {
      setAddDeptError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างแผนก');
    } finally {
      setIsSubmittingAddDept(false);
    }
  };

  // Open Edit Department Modal
  const openEditDeptModal = (dept: DepartmentItem) => {
    setEditDeptModalItem(dept);
    setEditDeptName(dept.name);
    setEditDeptCode(dept.code || '');
    setEditDeptDesc(dept.description || '');
    setEditDeptMigrateUsers(true);
    setEditDeptError('');
  };

  // Edit Department Submit
  const handleEditDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDeptModalItem) return;
    setEditDeptError('');
    const trimmedDeptName = editDeptName.trim();
    if (!trimmedDeptName) {
      setEditDeptError('กรุณาระบุชื่อแผนก');
      return;
    }
    setIsSubmittingEditDept(true);
    try {
      const res = await updateDepartment(
        editDeptModalItem.id,
        trimmedDeptName,
        editDeptDesc,
        editDeptCode
      );
      if (!res.success) {
        setEditDeptError(res.error || 'ไม่สามารถแก้ไขแผนกได้');
      } else {
        const oldName = res.oldName || editDeptModalItem.name;
        if (oldName !== trimmedDeptName && editDeptMigrateUsers) {
          const count = await batchUpdateUsersDepartment(oldName, trimmedDeptName, currentUser);
          if (count > 0 && onRefreshUsers) {
            onRefreshUsers();
          }
        }
        setEditDeptModalItem(null);
        showToast('บันทึกแผนกสำเร็จ!', `อัปเดตข้อมูลแผนก "${trimmedDeptName}" เรียบร้อยแล้ว`, 'success');
        triggerAlertBanner(
          'แก้ไขแผนกสำเร็จ',
          `อัปเดตข้อมูลแผนก "${trimmedDeptName}" เรียบร้อยแล้ว`,
          'success'
        );
      }
    } catch (err: unknown) {
      setEditDeptError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการแก้ไขแผนก');
    } finally {
      setIsSubmittingEditDept(false);
    }
  };

  // Open Delete Department Modal
  const openDeleteDeptModal = (dept: DepartmentItem) => {
    setDeleteDeptModalItem(dept);
    setDeleteDeptError('');
    const otherDepts = departments.filter((d) => d.id !== dept.id);
    setDeleteDeptTargetDept(otherDepts[0]?.name || '');
  };

  // Delete Department Submit
  const handleDeleteDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteDeptModalItem) return;
    setIsSubmittingDeleteDept(true);
    try {
      const deptName = deleteDeptModalItem.name;
      const userCount = getDeptUserCount(deptName);
      if (userCount > 0 && deleteDeptTargetDept) {
        await batchUpdateUsersDepartment(deptName, deleteDeptTargetDept, currentUser);
        if (onRefreshUsers) onRefreshUsers();
      }
      const res = await deleteDepartment(deleteDeptModalItem.id);
      if (!res.success) {
        setDeleteDeptError(res.error || 'ไม่สามารถลบแผนกได้');
      } else {
        setDeleteDeptModalItem(null);
        showToast('ลบแผนกสำเร็จ', `ลบแผนก "${deptName}" ออกจากระบบแล้ว`, 'info');
        triggerAlertBanner(
          'ลบแผนกสำเร็จ',
          `ลบแผนก "${deptName}" ออกจากระบบเรียบร้อยแล้ว`,
          'info'
        );
      }
    } catch (err: unknown) {
      setDeleteDeptError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบแผนก');
    } finally {
      setIsSubmittingDeleteDept(false);
    }
  };

  // Reset Departments to Default
  const handleResetDepartments = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันคืนค่าแผนกเริ่มต้น',
      message: 'คุณต้องการรีเซ็ตโครงสร้างแผนกกลับเป็นค่าเริ่มต้น 8 แผนกของบ้านโฮม ใช่หรือไม่? ข้อมูลพนักงานเดิมจะไม่ถูกลบ',
      confirmText: 'ยืนยันรีเซ็ต',
      isDestructive: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        const depts = await resetDepartmentsToDefault();
        setDepartments(depts);
        showToast('คืนค่าแผนกเริ่มต้นแล้ว', 'รีเซ็ตแผนกกลับเป็น 8 แผนกมาตรฐานเรียบร้อย', 'success');
        triggerAlertBanner(
          'คืนค่าโครงสร้างแผนกสำเร็จ',
          'รีเซ็ตโครงสร้างแผนกกลับเป็นค่าเริ่มต้น 8 แผนกของบ้านโฮมเรียบร้อยแล้ว',
          'success'
        );
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* High-visibility Floating Toast Notification (Top Center, z-[99999]) */}
      {toast && (
        <div
          id="system-status-toast"
          role="alert"
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-[99999] w-[90vw] max-w-md p-4 rounded-2xl shadow-2xl border transition-all animate-in fade-in slide-in-from-top-4 flex items-start gap-3.5 ${
            toast.type === 'error'
              ? 'bg-[#2E1218] border-[#E0526B] text-white shadow-[#B8324E]/30'
              : toast.type === 'info'
              ? 'bg-[#152A38] border-[#3894D6] text-white shadow-[#2B7DE9]/30'
              : 'bg-[#143325] border-[#34D399] text-white shadow-[#1B3D2F]/40'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              toast.type === 'error'
                ? 'bg-[#E0526B]/20 text-[#FF8598]'
                : toast.type === 'info'
                ? 'bg-[#3894D6]/20 text-[#60B5F7]'
                : 'bg-[#34D399]/20 text-[#34D399]'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5" />
            ) : toast.type === 'info' ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-wide">
                {toast.title}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-white/10 text-white/90">
                {toast.type === 'error' ? 'แจ้งเตือน' : 'สำเร็จ'}
              </span>
            </div>
            {toast.message && (
              <p className="text-xs text-white/80 mt-1 leading-relaxed break-words">
                {toast.message}
              </p>
            )}
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-white/60 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0"
            title="ปิดการแจ้งเตือน"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1B3D2F] via-[#244E3C] to-[#1E3A2B] rounded-2xl p-4 sm:p-6 text-white shadow-sm border border-[#2E6048]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8C57D]/20 text-[#F5DEAB] border border-[#E8C57D]/40">
                <ShieldCheck className="w-3.5 h-3.5" />
                Administrator Security Control
              </span>
              <span className="text-xs text-[#A8C7B2]">
                เข้าใช้งานโดย: {currentUser.name}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              ระบบจัดการผู้ใช้ สิทธิ์ 3 ระดับ และตรวจสอบความปลอดภัย
            </h1>
            <p className="text-xs sm:text-sm text-[#C8DEC5] mt-1 max-w-2xl leading-relaxed">
              พร้อมใช้งานจริง: กำหนดบทบาทพนักงาน (Knowledge User, Operator, Administrator) พร้อมรหัสผ่าน Hashed (SHA-256) และบันทึก Audit Logs ทุกกิจกรรม
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="admin-refresh-users-btn"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
              title="รีเฟรชข้อมูลบัญชีผู้ใช้และสิทธิ์"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              id="admin-add-user-btn"
              onClick={() => {
                setNewPassword(generateRandomPassword());
                setIsAddUserModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-[#1B3D2F] bg-[#F5E6BE] hover:bg-[#F2DCAB] border border-[#DFC790] shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>เพิ่มบัญชีผู้ใช้ใหม่</span>
            </button>
          </div>
        </div>

        {/* 3 Roles Quick Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/15">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#92E3A9]">1. Knowledge User</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">
                {users.filter((u) => u.role === 'Knowledge User').length} บัญชี
              </span>
            </div>
            <p className="text-xs text-[#E1EFE5] mt-1.5 leading-relaxed">
              ค้นหาคำถาม-คำตอบ น้องโฮม, ดูคู่มือเอกสาร, ส่งข้อเสนอแนะ (ไม่เห็น B2B / จัดการผู้ใช้)
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/15">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#9CC4F5]">2. Operator</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">
                {users.filter((u) => u.role === 'Operator').length} บัญชี
              </span>
            </div>
            <p className="text-xs text-[#E1EFE5] mt-1.5 leading-relaxed">
              สิทธิ์พื้นฐาน + B2B 101 เป้าหมาย, ประวัติ Sheets, นัดหมาย และคิวคำถามที่ตอบไม่ได้
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/15">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F8DCAB]">3. Administrator</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">
                {users.filter((u) => u.role === 'Administrator').length} บัญชี
              </span>
            </div>
            <p className="text-xs text-[#E1EFE5] mt-1.5 leading-relaxed">
              สิทธิ์สูงสุด: เพิ่ม/ปิด/ลบบัญชี, แก้ไขแผนก, เปลี่ยน Role, Reset Password และดู Audit Logs
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs (Users vs Matrix vs Activity Logs) */}
      <div className="flex items-center justify-between border-b border-[#E5E0D5] pb-2 overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            id="tab-user-list"
            onClick={() => setActiveSubTab('users')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeSubTab === 'users'
                ? 'bg-[#1B3D2F] text-white shadow-xs'
                : 'text-[#5A6E60] hover:bg-[#F2EFE8]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>รายชื่อผู้ใช้และสิทธิ์ ({filteredUsers.length})</span>
          </button>

          <button
            id="tab-departments"
            onClick={() => setActiveSubTab('departments')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeSubTab === 'departments'
                ? 'bg-[#1B3D2F] text-white shadow-xs'
                : 'text-[#5A6E60] hover:bg-[#F2EFE8]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>จัดการแผนก ({departments.length})</span>
          </button>

          <button
            id="tab-permission-matrix"
            onClick={() => setActiveSubTab('matrix')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeSubTab === 'matrix'
                ? 'bg-[#1B3D2F] text-white shadow-xs'
                : 'text-[#5A6E60] hover:bg-[#F2EFE8]'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>ตารางแจกแจงสิทธิ์ (Permission Matrix)</span>
          </button>

          <button
            id="tab-activity-logs"
            onClick={() => setActiveSubTab('activity')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeSubTab === 'activity'
                ? 'bg-[#1B3D2F] text-white shadow-xs'
                : 'text-[#5A6E60] hover:bg-[#F2EFE8]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>ประวัติการใช้งาน (Audit Logs) ({activityLogs.length})</span>
          </button>
        </div>

        {/* Quick CSV Export Button */}
        <div className="shrink-0">
          {activeSubTab === 'users' && (
            <button
              onClick={() => exportUsersToCSV(filteredUsers)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1B3D2F] bg-[#FAF8F5] hover:bg-[#F2EFE8] border border-[#D5D0C5] transition-all cursor-pointer"
              title="ส่งออกรายชื่อผู้ใช้เป็นไฟล์ CSV (รองรับภาษาไทยใน Excel)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ส่งออกรายชื่อ (CSV)</span>
            </button>
          )}

          {activeSubTab === 'activity' && (
            <button
              onClick={() => exportActivityLogsToCSV(filteredActivities)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1B3D2F] bg-[#FAF8F5] hover:bg-[#F2EFE8] border border-[#D5D0C5] transition-all cursor-pointer"
              title="ส่งออกประวัติกิจกรรมเป็นไฟล์ CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ส่งออก Audit Logs (CSV)</span>
            </button>
          )}
        </div>
      </div>

      {/* In-Page Action Feedback Banner (Visible immediately in view) */}
      {actionAlert && (
        <div
          id="action-feedback-banner"
          role="status"
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3.5 shadow-xs transition-all animate-in fade-in slide-in-from-top-2 ${
            actionAlert.type === 'error'
              ? 'bg-[#FDF0F2] border-[#F7BFC9] text-[#8F1D35]'
              : actionAlert.type === 'info'
              ? 'bg-[#F0F7FD] border-[#BEDEF8] text-[#1D5E94]'
              : 'bg-[#EFF8F2] border-[#A2D9B2] text-[#164B29]'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                actionAlert.type === 'error'
                  ? 'bg-[#F7BFC9] text-[#8F1D35]'
                  : actionAlert.type === 'info'
                  ? 'bg-[#BEDEF8] text-[#1D5E94]'
                  : 'bg-[#C3E8CE] text-[#164B29]'
              }`}
            >
              {actionAlert.type === 'error' ? (
                <AlertCircle className="w-4 h-4" />
              ) : actionAlert.type === 'info' ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <span>{actionAlert.title}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/80 border border-black/5 opacity-85">
                  บันทึกแล้วเมื่อ {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <p className="text-xs mt-0.5 opacity-90 leading-relaxed">{actionAlert.message}</p>
            </div>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-current opacity-60 hover:opacity-100 p-1 rounded-lg cursor-pointer transition-opacity shrink-0"
            title="ปิดการแจ้งเตือน"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SUB-TAB 1: USERS MANAGEMENT */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* Filters Bar with Department Support */}
          <div className="bg-white rounded-xl p-3.5 border border-[#E5E0D5] shadow-2xs flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="relative w-full lg:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#889E90]" />
              <input
                id="search-user-input"
                type="text"
                placeholder="ค้นหาชื่อ, Username หรือแผนก..."
                value={userSearchText}
                onChange={(e) => setUserSearchText(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-[#D5D0C5] focus:outline-none focus:border-[#1B3D2F] bg-[#FAF8F5]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Department Filter */}
              <div className="flex items-center gap-1 text-xs text-[#5A6E60]">
                <Building2 className="w-3.5 h-3.5 text-[#889E90]" />
                <span className="hidden sm:inline">แผนก:</span>
              </div>
              <select
                id="filter-department-select"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value as Department | 'all')}
                className="text-xs rounded-lg border border-[#D5D0C5] bg-[#FAF8F5] px-2.5 py-1.5 font-medium text-[#2C3E33] max-w-[160px] sm:max-w-[200px]"
              >
                <option value="all">ทุกแผนก (All Departments)</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name.split(' ')[0]}
                  </option>
                ))}
              </select>

              {/* Role Filter */}
              <div className="flex items-center gap-1 text-xs text-[#5A6E60]">
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">สิทธิ์:</span>
              </div>
              <select
                id="filter-role-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                className="text-xs rounded-lg border border-[#D5D0C5] bg-[#FAF8F5] px-2.5 py-1.5 font-medium text-[#2C3E33]"
              >
                <option value="all">ทุกสิทธิ์ (All Roles)</option>
                <option value="Knowledge User">Knowledge User</option>
                <option value="Operator">Operator</option>
                <option value="Administrator">Administrator</option>
              </select>

              {/* Status Filter */}
              <select
                id="filter-status-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as UserStatus | 'all')}
                className="text-xs rounded-lg border border-[#D5D0C5] bg-[#FAF8F5] px-2.5 py-1.5 font-medium text-[#2C3E33]"
              >
                <option value="all">ทุกสถานะ (All Status)</option>
                <option value="active">เปิดใช้งาน ({users.filter(u => u.status === 'active').length})</option>
                <option value="inactive">ปิดใช้งาน ({users.filter(u => u.status === 'inactive').length})</option>
              </select>
            </div>
          </div>

          {/* Desktop Users Table */}
          <div className="hidden md:block bg-white rounded-xl border border-[#E5E0D5] overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#FAF8F5] border-b border-[#E5E0D5] text-[#5A6E60] font-semibold">
                <tr>
                  <th className="py-3 px-4">ผู้ใช้งาน (พนักงาน)</th>
                  <th className="py-3 px-3">แผนก</th>
                  <th className="py-3 px-3">สิทธิ์การเข้าถึง (Role)</th>
                  <th className="py-3 px-3">สถานะบัญชี</th>
                  <th className="py-3 px-3">รหัสผ่าน (Hashed)</th>
                  <th className="py-3 px-3">เข้าใช้ล่าสุด</th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE6]">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#7A8E80]">
                      ไม่พบข้อมูลผู้ใช้ตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const roleConfig = ROLE_PERMISSIONS[user.role];
                    const isCurrent = user.id === currentUser.id;

                    return (
                      <tr key={user.id} className="hover:bg-[#FBF9F6] transition-colors">
                        {/* Name & Username */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#EBF3EC] flex items-center justify-center text-lg border border-[#CCE2CF] shrink-0">
                              {user.avatar || '🧑🏻‍💼'}
                            </div>
                            <div>
                              <div className="font-bold text-[#1B3D2F] flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {isCurrent && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#1B3D2F] text-white font-medium">
                                    คุณเอง
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-mono text-[#6F8274]">
                                @{user.username}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5 text-xs text-[#3E5244]">
                            <Building2 className="w-3.5 h-3.5 text-[#889E90] shrink-0" />
                            <span className="truncate max-w-[150px]">{user.department}</span>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${roleConfig.badgeBg} ${roleConfig.badgeText} ${roleConfig.badgeBorder}`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            {user.role}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          {user.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EBF7EE] text-[#1E6038] border border-[#BDE5C8]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#1E6038]"></span>
                              เปิดใช้งาน
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FDECEE] text-[#B8324E] border border-[#F7BFC9]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#B8324E]"></span>
                              ปิดใช้งาน
                            </span>
                          )}
                        </td>

                        {/* Password Hash Column */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5 text-xs font-mono text-[#7A8E80]" title="รหัสผ่านเดิมถูกเข้ารหัสความปลอดภัย SHA-256 ไม่แสดงข้อความตรง ๆ">
                            <EyeOff className="w-3.5 h-3.5 text-[#92A398]" />
                            <span className="bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E5E0D5] text-[11px]">
                              ••••••••••••
                            </span>
                          </div>
                        </td>

                        {/* Last Login */}
                        <td className="py-3.5 px-3 text-xs text-[#6F8274]">
                          {user.lastLoginAt ? (
                            <span>{user.lastLoginAt}</span>
                          ) : (
                            <span className="text-[#A2B5A8] italic">ยังไม่เคยเข้าใช้</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Edit Profile Button */}
                            <button
                              id={`btn-edit-user-${user.username}`}
                              onClick={() => openEditUserModal(user)}
                              className="p-1.5 rounded-lg text-[#23583C] hover:bg-[#EEF5EC] border border-transparent hover:border-[#D5E5D4] transition-all cursor-pointer"
                              title="แก้ไขข้อมูลพนักงาน (ชื่อ, แผนก, ไอคอน)"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Change Role Button */}
                            <button
                              id={`btn-change-role-${user.username}`}
                              onClick={() => openChangeRoleModal(user)}
                              className="p-1.5 rounded-lg text-[#1B4E7A] hover:bg-[#EBF3FC] border border-transparent hover:border-[#CADFF8] transition-all cursor-pointer"
                              title="เปลี่ยนระดับสิทธิ์ (Role)"
                            >
                              <UserCog className="w-4 h-4" />
                            </button>

                            {/* Reset Password Button */}
                            <button
                              id={`btn-reset-pass-${user.username}`}
                              onClick={() => openResetPasswordModal(user)}
                              className="p-1.5 rounded-lg text-[#9A5B08] hover:bg-[#FEF6E8] border border-transparent hover:border-[#FADDAE] transition-all cursor-pointer"
                              title="รีเซ็ตรหัสผ่านใหม่ (Reset Password)"
                            >
                              <Key className="w-4 h-4" />
                            </button>

                            {/* Toggle Status (Active / Inactive) */}
                            <button
                              id={`btn-toggle-status-${user.username}`}
                              onClick={() => handleToggleStatus(user)}
                              disabled={isCurrent}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                isCurrent
                                  ? 'opacity-20 cursor-not-allowed text-gray-400'
                                  : user.status === 'active'
                                  ? 'text-[#B8324E] hover:bg-[#FDECEE] border border-transparent hover:border-[#F7BFC9]'
                                  : 'text-[#1E6038] hover:bg-[#EBF7EE] border border-transparent hover:border-[#BDE5C8]'
                              }`}
                              title={isCurrent ? 'ไม่สามารถปิดบัญชีตนเองได้' : user.status === 'active' ? 'ปิดบัญชี (ระงับชั่วคราว)' : 'เปิดใช้งานบัญชี'}
                            >
                              <Power className="w-4 h-4" />
                            </button>

                            {/* Delete User Button */}
                            <button
                              id={`btn-delete-user-${user.username}`}
                              onClick={() => openDeleteModal(user)}
                              disabled={isCurrent}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                isCurrent
                                  ? 'opacity-20 cursor-not-allowed text-gray-400'
                                  : 'text-[#8A2B3D] hover:bg-[#FDECEE] border border-transparent hover:border-[#F7BFC9]'
                              }`}
                              title={isCurrent ? 'ไม่สามารถลบบัญชีตนเองได้' : 'ลบบัญชีผู้ใช้ถาวร'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Users Cards */}
          <div className="block md:hidden space-y-3">
            {filteredUsers.map((user) => {
              const roleConfig = ROLE_PERMISSIONS[user.role];
              const isCurrent = user.id === currentUser.id;

              return (
                <div
                  key={user.id}
                  className="bg-white rounded-xl p-4 border border-[#E5E0D5] shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#EBF3EC] flex items-center justify-center text-xl border border-[#CCE2CF] shrink-0">
                        {user.avatar || '🧑🏻‍💼'}
                      </div>
                      <div>
                        <div className="font-bold text-[#1B3D2F] flex items-center gap-1.5">
                          <span>{user.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#1B3D2F] text-white">
                              คุณเอง
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono text-[#6F8274]">
                          @{user.username}
                        </div>
                      </div>
                    </div>

                    {user.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EBF7EE] text-[#1E6038] border border-[#BDE5C8]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1E6038]"></span>
                        เปิดใช้งาน
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FDECEE] text-[#B8324E] border border-[#F7BFC9]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#B8324E]"></span>
                        ปิดใช้งาน
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-[#5A6E60] flex items-center justify-between border-t border-[#F2EFE8] pt-2">
                    <span>แผนก: {user.department}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleConfig.badgeBg} ${roleConfig.badgeText} ${roleConfig.badgeBorder}`}
                    >
                      {user.role}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#7A8E80] bg-[#FAF8F5] p-2 rounded-lg">
                    <span className="flex items-center gap-1">
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>รหัสผ่าน: ••••••••</span>
                    </span>
                    <span className="text-[11px]">
                      {user.lastLoginAt ? `เข้าใช้: ${user.lastLoginAt.split(' ')[0]}` : 'ยังไม่เคยเข้าใช้'}
                    </span>
                  </div>

                  {/* Actions for Mobile */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-[#F2EFE8]">
                    <button
                      onClick={() => openEditUserModal(user)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-[#1B3D2F] bg-[#FAF8F5] border border-[#D5D0C5]"
                      title="แก้ไขข้อมูล"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>แก้ไข</span>
                    </button>

                    <button
                      onClick={() => openChangeRoleModal(user)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-[#1B4E7A] bg-[#EBF3FC] border border-[#CADFF8]"
                      title="เปลี่ยนสิทธิ์"
                    >
                      <UserCog className="w-3.5 h-3.5" />
                      <span>สิทธิ์</span>
                    </button>

                    <button
                      onClick={() => openResetPasswordModal(user)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-[#9A5B08] bg-[#FEF6E8] border border-[#FADDAE]"
                      title="รีเซ็ตรหัส"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>รหัส</span>
                    </button>

                    <button
                      onClick={() => handleToggleStatus(user)}
                      disabled={isCurrent}
                      className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold ${
                        isCurrent
                          ? 'opacity-30 bg-gray-100 text-gray-400'
                          : user.status === 'active'
                          ? 'text-[#B8324E] bg-[#FDECEE] border border-[#F7BFC9]'
                          : 'text-[#1E6038] bg-[#EBF7EE] border border-[#BDE5C8]'
                      }`}
                      title={user.status === 'active' ? 'ปิดบัญชี' : 'เปิดใช้งาน'}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{user.status === 'active' ? 'ปิด' : 'เปิด'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DEPARTMENT MANAGEMENT (ALLOW EDIT & DELETE DEPARTMENTS) */}
      {activeSubTab === 'departments' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Top Bar: Description, Search, and Add Department Button */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E0D5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EBF3EC] text-[#1B3D2F] flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-[#1B3D2F]">
                  จัดการแผนกและโครงสร้างองค์กร (Department Management)
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FAF3E8] text-[#8C5D08] border border-[#F2DCAB] font-bold">
                  {departments.length} แผนก
                </span>
              </div>
              <p className="text-xs text-[#5A6E60] leading-relaxed">
                อนุญาตให้เพิ่ม แก้ไขชื่อแผนก และลบแผนกได้ตามต้องการ ข้อมูลเชื่อมโยงกับฐานข้อมูลพนักงานและซิงค์อัตโนมัติ
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#889E90]" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อหรือรหัสแผนก..."
                  value={deptSearchText}
                  onChange={(e) => setDeptSearchText(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#D5D0C5] bg-[#FAF8F5] focus:outline-none focus:border-[#1B3D2F]"
                />
              </div>

              <button
                id="btn-add-new-department"
                onClick={() => {
                  setNewDeptName('');
                  setNewDeptCode('');
                  setNewDeptDesc('');
                  setAddDeptError('');
                  setIsAddDeptModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#1B3D2F] hover:bg-[#244E3C] shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ เพิ่มแผนกใหม่</span>
              </button>

              <button
                onClick={handleResetDepartments}
                className="p-2 rounded-xl text-xs font-medium text-[#7A8E80] hover:text-[#1B3D2F] hover:bg-[#F2EFE8] border border-[#D5D0C5] transition-all cursor-pointer"
                title="คืนค่าแผนกเริ่มต้น 8 แผนกของบ้านโฮม"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Department Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {departments
              .filter((d) => 
                d.name.toLowerCase().includes(deptSearchText.toLowerCase()) ||
                (d.code && d.code.toLowerCase().includes(deptSearchText.toLowerCase())) ||
                (d.description && d.description.toLowerCase().includes(deptSearchText.toLowerCase()))
              )
              .map((dept) => {
                const assignedUsers = users.filter((u) => u.department === dept.name);
                const userCount = assignedUsers.length;

                return (
                  <div
                    key={dept.id}
                    className="bg-white rounded-2xl p-4 border border-[#E5E0D5] hover:border-[#1B3D2F]/40 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#EEF5EC] text-[#1B3D2F] flex items-center justify-center text-lg font-bold shrink-0 border border-[#D5E5D4]">
                            {dept.icon || '🏢'}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-[#1B3D2F] truncate">
                              {dept.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {dept.code && (
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-[#FAF3E8] text-[#8C5D08] border border-[#F2DCAB]">
                                  {dept.code}
                                </span>
                              )}
                              <span className="text-[11px] text-[#6F8274]">
                                {userCount} พนักงาน
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status / Count Pill */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          userCount > 0 
                            ? 'bg-[#EBF7EE] text-[#1E6038] border-[#BDE5C8]'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}>
                          {userCount > 0 ? `${userCount} บัญชี` : 'ไม่มีสมาชิก'}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[#5A6E60] leading-relaxed line-clamp-2 min-h-[32px] mt-1">
                        {dept.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                      </p>

                      {/* Assigned Users Avatars Preview */}
                      {userCount > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[#F2EFE8] flex items-center justify-between">
                          <span className="text-[11px] text-[#7A8E80]">พนักงานในสังกัด:</span>
                          <div className="flex items-center -space-x-1.5 overflow-hidden">
                            {assignedUsers.slice(0, 4).map((u) => (
                              <span
                                key={u.id}
                                className="w-6 h-6 rounded-full bg-[#FAF8F3] border-2 border-white flex items-center justify-center text-xs shadow-2xs"
                                title={`${u.name} (@${u.username})`}
                              >
                                {u.avatar || '👩🏻‍💼'}
                              </span>
                            ))}
                            {userCount > 4 && (
                              <span className="w-6 h-6 rounded-full bg-[#1B3D2F] text-white text-[10px] font-bold border-2 border-white flex items-center justify-center">
                                +{userCount - 4}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Department Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-[#F0ECE1] flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditDeptModal(dept)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1B3D2F] bg-[#FAF8F5] hover:bg-[#F2EFE8] border border-[#D5D0C5] transition-all cursor-pointer"
                        title="แก้ไขชื่อและรายละเอียดแผนก"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไขชื่อ</span>
                      </button>

                      <button
                        onClick={() => openDeleteDeptModal(dept)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#B8324E] bg-[#FDECEE] hover:bg-[#FBD6DC] border border-[#F7BFC9] transition-all cursor-pointer"
                        title="ลบแผนกนี้ออกจากระบบ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบ</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {departments.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-[#E5E0D5]">
              <Building2 className="w-10 h-10 mx-auto text-[#A5B8AC] mb-3" />
              <p className="font-bold text-[#1B3D2F]">ยังไม่มีแผนกในระบบ</p>
              <p className="text-xs text-[#5A6E60] mt-1 mb-4">
                คุณสามารถเพิ่มแผนกใหม่ หรือคืนค่าแผนกเริ่มต้น 8 แผนกของรีสอร์ทได้ทันที
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setIsAddDeptModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1B3D2F]"
                >
                  + เพิ่มแผนกใหม่
                </button>
                <button
                  onClick={handleResetDepartments}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#1B3D2F] bg-[#F2EFE8]"
                >
                  คืนค่าเริ่มต้น 8 แผนก
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: PERMISSION MATRIX TABLE (NEW COMPREHENSIVE AUDIT VIEW) */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#E8E1D2] flex items-start gap-3">
            <Info className="w-5 h-5 text-[#8C6D23] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-[#1B3D2F] text-sm">
                ตารางเมทริกซ์สิทธิ์การใช้งาน (Role-Based Access Control Matrix)
              </h3>
              <p className="text-xs text-[#5A6E60] leading-relaxed">
                ระบบใช้สถาปัตยกรรมแบบแยกสิทธิ์เด็ดขาด 3 ระดับ เพื่อความปลอดภัยของข้อมูลลูกค้า นโยบายราคา B2B และบัญชีพนักงาน ทุกการเปลี่ยนแปลงจะถูกตรวจสอบแบบ Real-time
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E0D5] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#FAF8F5] border-b border-[#E5E0D5] text-[#2C3E33]">
                  <tr>
                    <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-[#5A6E60]">
                      โมดูลและฟังก์ชันระบบ
                    </th>
                    <th className="py-3.5 px-3 text-center font-bold text-xs">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-[#EAF5EC] text-[#1E6038] border border-[#BFE3CA]">
                        Knowledge User
                      </span>
                    </th>
                    <th className="py-3.5 px-3 text-center font-bold text-xs">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-[#EBF3FC] text-[#1E4E8C] border border-[#BAD7F9]">
                        Operator
                      </span>
                    </th>
                    <th className="py-3.5 px-3 text-center font-bold text-xs">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-[#FEF6E8] text-[#9A5B08] border border-[#F8DCAB]">
                        Administrator
                      </span>
                    </th>
                    <th className="py-3.5 px-4 font-semibold text-xs text-[#5A6E60]">
                      หมายเหตุและข้อกำหนดความปลอดภัย
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE6]">
                  {PERMISSION_MATRIX_DATA.map((item, index) => (
                    <tr key={index} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="py-3 px-4 font-medium text-[#1B3D2F]">
                        {item.feature}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.kuser ? (
                          <CheckCircle className="w-5 h-5 text-[#1E6038] inline-block" />
                        ) : (
                          <XCircle className="w-5 h-5 text-[#D1D5DB] inline-block" />
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.operator ? (
                          <CheckCircle className="w-5 h-5 text-[#1E4E8C] inline-block" />
                        ) : (
                          <XCircle className="w-5 h-5 text-[#D1D5DB] inline-block" />
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.admin ? (
                          <CheckCircle className="w-5 h-5 text-[#9A5B08] inline-block" />
                        ) : (
                          <XCircle className="w-5 h-5 text-[#D1D5DB] inline-block" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#5A6E60]">
                        {item.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: USER ACTIVITY / AUDIT LOGS */}
      {activeSubTab === 'activity' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-xl p-3.5 border border-[#E5E0D5] shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#889E90]" />
              <input
                id="search-activity-input"
                type="text"
                placeholder="ค้นหากิจกรรม, คำค้น หรือชื่อพนักงาน..."
                value={activitySearchText}
                onChange={(e) => setActivitySearchText(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-[#D5D0C5] focus:outline-none focus:border-[#1B3D2F] bg-[#FAF8F5]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1 text-xs text-[#5A6E60]">
                <Filter className="w-3.5 h-3.5" />
                <span>กรองรายบุคคล:</span>
              </div>
              <select
                id="filter-activity-user"
                value={activityUserFilter}
                onChange={(e) => setActivityUserFilter(e.target.value)}
                className="text-xs rounded-lg border border-[#D5D0C5] bg-[#FAF8F5] px-2.5 py-1.5 font-medium text-[#2C3E33]"
              >
                <option value="all">พนักงานทุกคน (All Users)</option>
                {uniqueUsersInLogs.map(([uname, label]) => (
                  <option key={uname} value={uname}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                id="filter-activity-action"
                value={activityActionFilter}
                onChange={(e) => setActivityActionFilter(e.target.value)}
                className="text-xs rounded-lg border border-[#D5D0C5] bg-[#FAF8F5] px-2.5 py-1.5 font-medium text-[#2C3E33]"
              >
                <option value="all">ทุกประเภทกิจกรรม (All Actions)</option>
                <option value="LOGIN">เข้าสู่ระบบ (LOGIN)</option>
                <option value="SEARCH_QA">ค้นหาคำถาม (SEARCH_QA)</option>
                <option value="VIEW_DOC">อ่านคู่มือ (VIEW_DOC)</option>
                <option value="UPDATE_B2B">จัดการ B2B (UPDATE_B2B)</option>
                <option value="ADMIN_CREATE_USER">แอดมิน: เพิ่มบัญชี (CREATE_USER)</option>
                <option value="ADMIN_EDIT_USER">แอดมิน: แก้ไขข้อมูล (EDIT_USER)</option>
                <option value="ADMIN_CHANGE_ROLE">แอดมิน: เปลี่ยนสิทธิ์ (CHANGE_ROLE)</option>
                <option value="ADMIN_TOGGLE_STATUS">แอดมิน: ปิด/เปิดบัญชี (TOGGLE_STATUS)</option>
                <option value="ADMIN_RESET_PASSWORD">แอดมิน: รีเซ็ตรหัสผ่าน (RESET_PASSWORD)</option>
                <option value="ADMIN_DELETE_USER">แอดมิน: ลบบัญชี (DELETE_USER)</option>
              </select>
            </div>
          </div>

          {/* Activity Logs Timeline / Table */}
          <div className="bg-white rounded-xl border border-[#E5E0D5] overflow-hidden shadow-2xs">
            {filteredActivities.length === 0 ? (
              <div className="p-8 text-center text-[#7A8E80]">
                <History className="w-8 h-8 mx-auto text-[#A5B8AC] mb-2" />
                <p className="font-semibold text-sm">ไม่พบประวัติการใช้งานตามเงื่อนไขที่เลือก</p>
                <p className="text-xs mt-1">ลองเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรอง</p>
              </div>
            ) : (
              <div className="divide-y divide-[#EFECE6]">
                {filteredActivities.map((log) => {
                  let actionBadgeColor = 'bg-gray-100 text-gray-700 border-gray-200';
                  let actionLabel = log.action;

                  if (log.action === 'LOGIN') {
                    actionBadgeColor = 'bg-[#EBF7EE] text-[#1E6038] border-[#BDE5C8]';
                    actionLabel = 'เข้าสู่ระบบ';
                  } else if (log.action === 'SEARCH_QA') {
                    actionBadgeColor = 'bg-[#EBF3FC] text-[#1E4E8C] border-[#BAD7F9]';
                    actionLabel = 'ค้นหาความรู้';
                  } else if (log.action === 'VIEW_DOC') {
                    actionBadgeColor = 'bg-[#F5EDFD] text-[#6B21A8] border-[#E9D5FF]';
                    actionLabel = 'เปิดเอกสาร';
                  } else if (log.action?.startsWith('ADMIN_')) {
                    actionBadgeColor = 'bg-[#FEF6E8] text-[#9A5B08] border-[#FADDAE]';
                    if (log.action === 'ADMIN_CREATE_USER') actionLabel = 'เพิ่มผู้ใช้ใหม่';
                    if (log.action === 'ADMIN_EDIT_USER') actionLabel = 'แก้ไขข้อมูลพนักงาน';
                    if (log.action === 'ADMIN_CHANGE_ROLE') actionLabel = 'เปลี่ยนสิทธิ์ Role';
                    if (log.action === 'ADMIN_TOGGLE_STATUS') actionLabel = 'สลับสถานะบัญชี';
                    if (log.action === 'ADMIN_RESET_PASSWORD') actionLabel = 'รีเซ็ตรหัสผ่าน';
                    if (log.action === 'ADMIN_DELETE_USER') actionLabel = 'ลบบัญชีผู้ใช้';
                  } else if (log.action?.includes('B2B')) {
                    actionBadgeColor = 'bg-[#FFF0F5] text-[#9C1D54] border-[#FBCFE8]';
                    actionLabel = 'จัดการ B2B';
                  }

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 sm:p-4 hover:bg-[#FAF8F5] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#EEF5EC] text-[#1B3D2F] font-bold text-xs flex items-center justify-center shrink-0 border border-[#D5E5D4] mt-0.5">
                          {log.staffName?.charAt(0) || 'U'}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-[#1B3D2F]">
                              {log.staffName}
                            </span>
                            <span className="text-xs font-mono text-[#6F8274]">
                              (@{log.username})
                            </span>
                            <span className="text-[10px] px-2 py-0.2 rounded-full font-medium bg-[#FAF3E8] text-[#8C5D08] border border-[#F2DCAB]">
                              {log.role}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.2 rounded-full font-bold border ${actionBadgeColor}`}
                            >
                              {actionLabel}
                            </span>
                          </div>
                          <p className="text-xs text-[#3E5244] leading-relaxed">
                            {log.details}
                          </p>
                        </div>
                      </div>

                      <div className="text-[11px] font-mono text-[#7A8E80] shrink-0 self-end sm:self-center bg-[#FAF8F5] sm:bg-transparent px-2 py-1 rounded">
                        {log.timestamp}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW USER */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E5E0D5] animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D5]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EBF3EC] text-[#1B3D2F] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1B3D2F] text-base">เพิ่มบัญชีผู้ใช้ใหม่</h3>
                  <p className="text-xs text-[#6F8274]">กำหนดสิทธิ์เริ่มต้น และรหัสผ่านแรกเข้า</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-[#889E90] hover:text-[#1B3D2F] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-4 mt-4">
              {addError && (
                <div className="p-3 rounded-xl bg-[#FDECEE] border border-[#F7BFC9] text-[#B8324E] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}
              {addSuccessMsg && (
                <div className="p-3 rounded-xl bg-[#EBF7EE] border border-[#BDE5C8] text-[#1E6038] text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{addSuccessMsg}</span>
                </div>
              )}

              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-[#2C3E33] mb-1">
                  ชื่อผู้ใช้สำหรับเข้าสู่ระบบ (Username) *
                </label>
                <input
                  id="new-user-username-input"
                  type="text"
                  placeholder="เช่น ploy_fo, somchai_fb, officer01"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#D5D0C5] focus:outline-none focus:border-[#1B3D2F] font-mono"
                  required
                />
                <p className="text-[11px] text-[#7A8E80] mt-1">
                  ใช้ตัวอักษรภาษาอังกฤษพิมพ์เล็ก ตัวเลข และขีดล่าง _ เท่านั้น
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#2C3E33] mb-1">
                  ชื่อ-นามสกุล / ชื่อเล่นพนักงาน *
                </label>
                <input
                  id="new-user-name-input"
                  type="text"
                  placeholder="เช่น น้องแพรวา (ต้อนรับ), คุณกิตติศักดิ์"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#D5D0C5] focus:outline-none focus:border-[#1B3D2F]"
                  required
                />
              </div>

              {/* Department */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#2C3E33]">
                    แผนกประจำ *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddUserModalOpen(false);
                      setActiveSubTab('departments');
                    }}
                    className="text-[11px] text-[#24543C] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Building2 className="w-3 h-3" />
                    <span>จัดการ / เพิ่มแผนก</span>
                  </button>
                </div>
                <select
                  id="new-user-dept-select"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value as Department)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#D5D0C5] focus:outline-none focus:border-[#1B3D2F] bg-white"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-[#2C3E33] mb-1">
                  กำหนดระดับสิทธิ์เริ่มต้น (Initial Role) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                  {(['Knowledge User', 'Operator', 'Administrator'] as UserRole[]).map((r) => {
                    const isSelected = newRole === r;
                    return (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setNewRole(r)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#1B3D2F] bg-[#EEF5EC] text-[#1B3D2F] ring-1 ring-[#1B3D2F]'
                            : 'border-[#D5D0C5] hover:bg-[#FAF8F5] text-[#5A6E60]'
                        }`}
                      >
                        <div className="font-bold text-xs">{r}</div>
                        <div className="text-[10px] mt-0.5 leading-tight opacity-80">
                          {r === 'Knowledge User'
                            ? 'ถาม-ตอบ & อ่านเอกสาร'
                            : r === 'Operator'
                            ? 'B2B & Logs & คิวคำถาม'
                            : 'จัดการระบบ & ผู้ใช้ทั้งหมด'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Password Initial Setup */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#2C3E33]">
                    รหัสผ่านเริ่มต้น (Initial Password) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="text-[11px] text-[#1B3D2F] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-[#E8C57D]" />
                    <span>สุ่มรหัสผ่านปลอดภัย</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="new-user-password-input"
                    type="text"
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-20 py-2 text-sm rounded-xl border border-[#D5D0C5] focus:outline-none focus:border-[#1B3D2F] font-mono"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#889E90] bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#E5E0D5]">
                    SHA-256
                  </span>
                </div>
                <div className="p-2.5 mt-2 rounded-lg bg-[#FAF8F5] border border-[#E5E0D5] text-[11px] text-[#6F8274] space-y-1">
                  <div className="flex items-center gap-1.5 text-[#1B3D2F] font-semibold">
                    <Lock className="w-3.5 h-3.5 text-[#2E7246]" />
                    <span>นโยบายความปลอดภัยของระบบ:</span>
                  </div>
                  <p>
                    รหัสผ่านจะถูกเข้ารหัส Hashed ทันทีเมื่อบันทึก และจะไม่ถูกแสดงเป็นข้อความตรง ๆ ในตารางผู้ใช้
                  </p>
                </div>
              </div>

              {/* Avatar Emoji */}
              <div>
                <label className="block text-xs font-bold text-[#2C3E33] mb-1">
                  ไอคอนประจำตัว (Avatar)
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {['👩🏻‍💼', '👨🏻‍💼', '🧑🏻‍💼', '👩🏻‍🍳', '👨🏻‍🍳', '👨🏻‍💻', '👩🏻‍💻', '👨🏻‍🔧'].map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => setNewAvatar(emoji)}
                      className={`w-9 h-9 rounded-full text-lg flex items-center justify-center border transition-all cursor-pointer ${
                        newAvatar === emoji
                          ? 'border-[#1B3D2F] bg-[#EEF5EC] scale-110 shadow-xs'
                          : 'border-transparent hover:bg-gray-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E0D5]">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5A6E60] hover:bg-[#F2EFE8] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  id="confirm-add-user-btn"
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#1B3D2F] hover:bg-[#244E3C] shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAdd ? 'กำลังบันทึก...' : 'บันทึกบัญชีใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER PROFILE (NEW) */}
      {editModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E5E0D5] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D5]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EEF5EC] text-[#1B3D2F] flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1B3D2F] text-base">แก้ไขข้อมูลพนักงาน</h3>
                  <p className="text-xs text-[#6F8274]">
                    @{editModalUser.username}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditModalUser(null)}
                className="text-[#889E90] hover:text-[#1B3D2F] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-4 mt-4">
              {editError && (
                <div className="p-3 rounded-xl bg-[#FDECEE] border border-[#F7BFC9] text-[#B8324E] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#2C3E33] mb-1">
                  ชื่อผู้ใช้ (Username)
                </label>
                <input
                  type="text"
                  value={editModalUser.username}
                  disabled
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#E5E0D5] bg-[#F5F2EA] text-[#6F8274] font-mono cursor-not-allowed"
                />
                <span className="text-[10px] text-[#889E90] mt-0.5 block">
                  Username เป็นรหัสอ้างอิงหลัก ไม่สามารถเปลี่ยนได้
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E33] mb-1">
                  ชื่อ-นามสกุล / ชื่อเล่นพนักงาน *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#D5D0C5] focus:outline-none focus:border-[#1B3D2F]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E33] mb-1">
                  แผนกประจำ *
                </label>
                <select
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value as Department)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#D5D0C5] focus:outline-none focus:border-[#1B3D2F] bg-white"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E33] mb-1">
                  ไอคอนประจำตัว (Avatar)
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {['👩🏻‍💼', '👨🏻‍💼', '🧑🏻‍💼', '👩🏻‍🍳', '👨🏻‍🍳', '👨🏻‍💻', '👩🏻‍💻', '👨🏻‍🔧'].map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => setEditAvatar(emoji)}
                      className={`w-9 h-9 rounded-full text-lg flex items-center justify-center border transition-all cursor-pointer ${
                        editAvatar === emoji
                          ? 'border-[#1B3D2F] bg-[#EEF5EC] scale-110 shadow-xs'
                          : 'border-transparent hover:bg-gray-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E0D5]">
                <button
                  type="button"
                  onClick={() => setEditModalUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5A6E60] hover:bg-[#F2EFE8] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#1B3D2F] hover:bg-[#244E3C] shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RESET PASSWORD */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E5E0D5] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D5]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FEF6E8] text-[#9A5B08] flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1B3D2F] text-base">รีเซ็ตรหัสผ่านใหม่</h3>
                  <p className="text-xs text-[#6F8274]">
                    @{resetModalUser.username} ({resetModalUser.name})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResetModalUser(null)}
                className="text-[#889E90] hover:text-[#1B3D2F] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 mt-4">
              {resetError && (
                <div className="p-3 rounded-xl bg-[#FDECEE] border border-[#F7BFC9] text-[#B8324E] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}
              {resetSuccessMsg && (
                <div className="p-3 rounded-xl bg-[#EBF7EE] border border-[#BDE5C8] text-[#1E6038] text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{resetSuccessMsg}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E5E0D5] text-xs text-[#5A6E60] space-y-1">
                <div className="flex items-center gap-1.5 text-[#1B3D2F] font-bold">
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>รหัสผ่านเดิมถูกเข้ารหัสไว้ (ไม่แสดงข้อความ)</span>
                </div>
                <p>
                  ตามมาตรฐานความปลอดภัย ระบบจะไม่อนุญาตให้ดูรหัสผ่านเดิม แต่แอดมินสามารถตั้งรหัสผ่านใหม่เพื่อให้พนักงานนำไปเข้าสู่ระบบได้ทันที
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#2C3E33]">
                    รหัสผ่านใหม่ (New Temporary Password) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setTempPassword(generateRandomPassword())}
                    className="text-[11px] text-[#1B3D2F] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-[#E8C57D]" />
                    <span>สุ่มรหัสผ่านใหม่</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="reset-temp-password-input"
                    type="text"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#D5D0C5] focus:outline-none focus:border-[#1B3D2F] font-mono bg-[#FAF8F5]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(tempPassword);
                      setCopiedPassword(true);
                      setTimeout(() => setCopiedPassword(false), 2000);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold border border-[#D5D0C5] hover:bg-gray-100 flex items-center gap-1 shrink-0 cursor-pointer"
                    title="คัดลอกรหัสผ่านเพื่อส่งให้พนักงาน"
                  >
                    {copiedPassword ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-green-600">คัดลอกแล้ว</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอก</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E0D5]">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5A6E60] hover:bg-[#F2EFE8] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  id="confirm-reset-password-btn"
                  type="submit"
                  disabled={isSubmittingReset}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#9A5B08] hover:bg-[#7D4A06] shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReset ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CHANGE ROLE */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E5E0D5] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D5]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EEF5EC] text-[#1B3D2F] flex items-center justify-center">
                  <UserCog className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1B3D2F] text-base">เปลี่ยนระดับสิทธิ์ (Change Role)</h3>
                  <p className="text-xs text-[#6F8274]">
                    @{roleModalUser.username} ({roleModalUser.name})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRoleModalUser(null)}
                className="text-[#889E90] hover:text-[#1B3D2F] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4">
              <p className="text-xs text-[#5A6E60]">
                เลือกระดับสิทธิ์ที่ต้องการมอบหมายให้กับบัญชีนี้:
              </p>

              <div className="space-y-2">
                {(['Knowledge User', 'Operator', 'Administrator'] as UserRole[]).map((r) => {
                  const isSelected = targetRole === r;
                  const config = ROLE_PERMISSIONS[r];

                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTargetRole(r)}
                      className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#1B3D2F] bg-[#EEF5EC] ring-1 ring-[#1B3D2F]'
                          : 'border-[#D5D0C5] hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#1B3D2F]">{r}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#1B3D2F]" />}
                      </div>
                      <p className="text-[11px] text-[#5A6E60] mt-1 leading-relaxed">
                        {config.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E0D5]">
                <button
                  type="button"
                  onClick={() => setRoleModalUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5A6E60] hover:bg-[#F2EFE8] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  id="confirm-change-role-btn"
                  type="button"
                  onClick={handleChangeRoleSubmit}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#1B3D2F] hover:bg-[#244E3C] shadow-sm transition-all cursor-pointer"
                >
                  ยืนยันเปลี่ยนสิทธิ์
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: DELETE USER CONFIRMATION (NEW) */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#F7BFC9] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#F7BFC9]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FDECEE] text-[#B8324E] flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#B8324E] text-base">ยืนยันการลบบัญชีผู้ใช้</h3>
                  <p className="text-xs text-[#6F8274]">
                    การกระทำนี้ไม่สามารถย้อนกลับได้
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteModalUser(null)}
                className="text-[#889E90] hover:text-[#1B3D2F] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeleteUserSubmit} className="space-y-4 mt-4">
              {deleteError && (
                <div className="p-3 rounded-xl bg-[#FDECEE] border border-[#F7BFC9] text-[#B8324E] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-[#FEF6E8] border border-[#FADDAE] text-xs text-[#9A5B08] space-y-1">
                <p className="font-bold">คำเตือนความปลอดภัย:</p>
                <p>
                  คุณกำลังจะลบบัญชี <strong>@{deleteModalUser.username}</strong> ({deleteModalUser.name}) แผนก <strong>{deleteModalUser.department}</strong> สิทธิ์ <strong>{deleteModalUser.role}</strong> ออกจากระบบ
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E33] mb-1">
                  พิมพ์ชื่อผู้ใช้ <span className="font-mono text-[#B8324E]">@{deleteModalUser.username}</span> เพื่อยืนยัน:
                </label>
                <input
                  type="text"
                  placeholder={deleteModalUser.username}
                  value={deleteConfirmationInput}
                  onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#D5D0C5] focus:outline-none focus:border-[#B8324E] font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E0D5]">
                <button
                  type="button"
                  onClick={() => setDeleteModalUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5A6E60] hover:bg-[#F2EFE8] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDelete}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#B8324E] hover:bg-[#9B253D] shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingDelete ? 'กำลังลบ...' : 'ยืนยันลบบัญชี'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENERIC IN-APP CONFIRMATION DIALOG (REPLACES WINDOW.CONFIRM) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#E5E0D5] animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                confirmDialog.isDestructive ? 'bg-[#FDECEE] text-[#B8324E]' : 'bg-[#EBF3EC] text-[#1B3D2F]'
              }`}>
                {confirmDialog.isDestructive ? <AlertCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1B3D2F] text-base leading-tight">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-[#5A6E60] leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0ECE1]">
              <button
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#5A6E60] hover:bg-[#F2EFE8] cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer ${
                  confirmDialog.isDestructive
                    ? 'bg-[#B8324E] hover:bg-[#9B253D]'
                    : 'bg-[#1B3D2F] hover:bg-[#244E3C]'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD DEPARTMENT */}
      {isAddDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E5E0D5] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D5]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EBF3EC] text-[#1B3D2F] flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1B3D2F] text-base">เพิ่มแผนกใหม่</h3>
                  <p className="text-xs text-[#6F8274]">สร้างแผนกเพื่อจัดสรรพนักงานและกำหนดสิทธิ์</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddDeptModalOpen(false)}
                className="text-[#889E90] hover:text-[#1B3D2F] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDeptSubmit} className="space-y-4 mt-4">
              {addDeptError && (
                <div className="p-3 rounded-xl bg-[#FDECEE] border border-[#F7BFC9] text-[#B8324E] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addDeptError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#2C3E33] mb-1">
                  ชื่อแผนก (Department Name) *
                </label>
                <input
                  type="text"
                  placeholder="เช่น การตลาดออนไลน์, สวนและภูมิทัศน์"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#D5D0C5] focus:outline-none focus:border-[#1B3D2F]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E33] mb-1">
                  รหัสแผนก (Department Code)
                </label>
                <input
                  type="text"
                  placeholder="เช่น MKT, GARDEN, SEC"
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#D5D0C5] focus:outline-none focus:border-[#1B3D2F] font-mono uppercase"
                  maxLength={8}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E33] mb-1">
                  คำอธิบายหน้าที่ความรับผิดชอบ
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น ดูแลการตลาดดิจิทัล แคมเปญโซเชียล และโปรโมชั่นที่พัก"
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#D5D0C5] focus:outline-none focus:border-[#1B3D2F] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E0D5]">
                <button
                  type="button"
                  onClick={() => setIsAddDeptModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5A6E60] hover:bg-[#F2EFE8] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAddDept}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#1B3D2F] hover:bg-[#244E3C] shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAddDept ? 'กำลังบันทึก...' : 'บันทึกแผนกใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT DEPARTMENT (ALLOW EDIT NAME & DETAILS) */}
      {editDeptModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E5E0D5] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D5]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EBF3EC] text-[#1B3D2F] flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1B3D2F] text-base">แก้ไขชื่อและข้อมูลแผนก</h3>
                  <p className="text-xs text-[#6F8274]">{editDeptModalItem.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditDeptModalItem(null)}
                className="text-[#889E90] hover:text-[#1B3D2F] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditDeptSubmit} className="space-y-4 mt-4">
              {editDeptError && (
                <div className="p-3 rounded-xl bg-[#FDECEE] border border-[#F7BFC9] text-[#B8324E] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editDeptError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#2C3E33] mb-1">
                  ชื่อแผนกใหม่ *
                </label>
                <input
                  type="text"
                  value={editDeptName}
                  onChange={(e) => setEditDeptName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#D5D0C5] focus:outline-none focus:border-[#1B3D2F]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E33] mb-1">
                  รหัสแผนก (Code)
                </label>
                <input
                  type="text"
                  value={editDeptCode}
                  onChange={(e) => setEditDeptCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#D5D0C5] focus:outline-none focus:border-[#1B3D2F] font-mono uppercase"
                  maxLength={8}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E33] mb-1">
                  คำอธิบายหน้าที่ความรับผิดชอบ
                </label>
                <textarea
                  rows={2}
                  value={editDeptDesc}
                  onChange={(e) => setEditDeptDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#D5D0C5] focus:outline-none focus:border-[#1B3D2F] resize-none"
                />
              </div>

              {/* Cascade update notice */}
              {getDeptUserCount(editDeptModalItem.name) > 0 && (
                <div className="bg-[#FAF8F3] p-3 rounded-xl border border-[#E8E1D2] space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editDeptMigrateUsers}
                      onChange={(e) => setEditDeptMigrateUsers(e.target.checked)}
                      className="mt-0.5 rounded text-[#1B3D2F] focus:ring-[#1B3D2F]"
                    />
                    <span className="text-xs text-[#2C3E33] font-medium leading-relaxed">
                      อัปเดตชื่อแผนกนี้ให้กับพนักงานทุกคนที่สังกัดอยู่ (<strong>{getDeptUserCount(editDeptModalItem.name)} คน</strong>) โดยอัตโนมัติ
                    </span>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E0D5]">
                <button
                  type="button"
                  onClick={() => setEditDeptModalItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5A6E60] hover:bg-[#F2EFE8] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditDept}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#1B3D2F] hover:bg-[#244E3C] shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEditDept ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE DEPARTMENT (ALLOW DELETE WITH REASSIGNMENT SAFEGUARD) */}
      {deleteDeptModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E5E0D5] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D5]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FDECEE] text-[#B8324E] flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1B3D2F] text-base">ยืนยันการลบแผนก</h3>
                  <p className="text-xs text-[#B8324E] font-semibold">{deleteDeptModalItem.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteDeptModalItem(null)}
                className="text-[#889E90] hover:text-[#1B3D2F] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeleteDeptSubmit} className="space-y-4 mt-4">
              {deleteDeptError && (
                <div className="p-3 rounded-xl bg-[#FDECEE] border border-[#F7BFC9] text-[#B8324E] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deleteDeptError}</span>
                </div>
              )}

              {getDeptUserCount(deleteDeptModalItem.name) > 0 ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-[#FFF8E6] border border-[#F3D794] text-[#8C5D08] text-xs leading-relaxed flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#B57C1E]" />
                    <div>
                      <strong>มีพนักงานสังกัดแผนกนี้อยู่ {getDeptUserCount(deleteDeptModalItem.name)} คน</strong>
                      <p className="mt-1 text-[#6B4605]">
                        เพื่อไม่ให้ข้อมูลพนักงานค้างอยู่ โปรดเลือกแผนกใหม่ที่จะย้ายพนักงานเหล่านี้ไปอยู่ก่อนลบ:
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C3E33] mb-1">
                      ย้ายพนักงานทั้งหมดไปยังแผนก:
                    </label>
                    <select
                      value={deleteDeptTargetDept}
                      onChange={(e) => setDeleteDeptTargetDept(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-[#D5D0C5] bg-white focus:outline-none focus:border-[#1B3D2F]"
                      required
                    >
                      {departments
                        .filter((d) => d.id !== deleteDeptModalItem.id)
                        .map((dept) => (
                          <option key={dept.id} value={dept.name}>
                            {dept.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#5A6E60] leading-relaxed">
                  แผนกนี้ไม่มีพนักงานสังกัดอยู่ คุณสามารถลบแผนกนี้ออกจากระบบได้ทันที
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E0D5]">
                <button
                  type="button"
                  onClick={() => setDeleteDeptModalItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5A6E60] hover:bg-[#F2EFE8] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDeleteDept}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#B8324E] hover:bg-[#9B253D] shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingDeleteDept ? 'กำลังลบแผนก...' : 'ยืนยันลบแผนก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
