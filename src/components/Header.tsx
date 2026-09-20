import React, { useState } from 'react';
import {
  Search,
  BookOpen,
  History,
  ChevronDown,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Layers,
  ShieldCheck,
  FileSpreadsheet,
  Edit3,
  Target,
  Lock,
  ShieldAlert,
  Users,
  LogOut,
  UserCheck,
  Key
} from 'lucide-react';
import { StaffProfile, UserRole } from '../types';
import { ROLE_PERMISSIONS } from '../utils/authService';
import { GoogleSheetsDbConfig } from '../utils/googleSheetsDatabase';

export type NavigationTab = 'qa' | 'b2b' | 'sheets' | 'unanswered' | 'docs' | 'arch' | 'users';

interface HeaderProps {
  currentStaff: StaffProfile;
  onSelectStaff: (staff: StaffProfile) => void;
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  unansweredCount: number;
  onOpenSheetsSync?: () => void;
  isUsingCustomSheet?: boolean;
  onOpenGoogleSheetsDbModal?: () => void;
  sheetsDbConfig?: GoogleSheetsDbConfig | null;
  onEditProfile?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentStaff,
  onSelectStaff,
  activeTab,
  onSelectTab,
  unansweredCount,
  onOpenSheetsSync,
  isUsingCustomSheet = false,
  onOpenGoogleSheetsDbModal,
  sheetsDbConfig,
  onEditProfile,
  onLogout,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [showAdvancedAdminDatabase, setShowAdvancedAdminDatabase] = useState(false);

  const currentRole: UserRole = currentStaff.role || 'Knowledge User';
  const rolePermissions = ROLE_PERMISSIONS[currentRole] || ROLE_PERMISSIONS['Knowledge User'];

  const isKnowledgeUser = currentRole === 'Knowledge User';
  const isOperator = currentRole === 'Operator';
  const isAdmin = currentRole === 'Administrator';

  return (
    <header className="sticky top-0 z-40 px-3 sm:px-6 py-2 bg-[#F8F6F0]/95 backdrop-blur-md border-b border-[#E8E1D2]/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 bg-white px-3 sm:px-4 py-2 rounded-2xl shadow-xs border border-[#EDE7DB]">
        {/* Left: Brand Identity */}
        <div 
          onClick={() => onSelectTab('qa')}
          className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
        >
          {/* Logo Circle */}
          <div className="w-9 h-9 rounded-xl bg-[#1B3D2F] text-[#E5BF77] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4.5 h-4.5 text-[#E5BF77]"
            >
              <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold text-[#1B3D2F] tracking-tight leading-tight whitespace-nowrap">
                น้องโฮม
              </h1>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#EEF5EC] text-[#24533A] font-semibold hidden md:inline-block">
                Internal
              </span>
            </div>
            <p className="text-[10px] text-[#697E72] font-medium leading-none mt-0.5 hidden sm:block whitespace-nowrap">
              Baan Home Resort & Restaurant
            </p>
          </div>
        </div>

        {/* Right: Main Navigation Tabs & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Desktop Navigation Tabs */}
          <div className="hidden md:flex items-center gap-1">
            {/* 1. ถาม-ตอบ (Visible to: ALL ROLES) */}
            <button
              id="nav-tab-qa"
              onClick={() => onSelectTab('qa')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === 'qa'
                  ? 'bg-[#1B3D2F] text-white shadow-xs'
                  : 'text-[#415649] hover:bg-[#F2EFE8] hover:text-[#1B3D2F]'
              }`}
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">ถาม-ตอบ</span>
            </button>

            {/* 2. หมวดความรู้ (Visible to: ALL ROLES) */}
            <button
              id="nav-tab-docs"
              onClick={() => onSelectTab('docs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === 'docs'
                  ? 'bg-[#1B3D2F] text-white shadow-xs font-semibold'
                  : 'text-[#415649] hover:bg-[#F2EFE8] hover:text-[#1B3D2F]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">หมวดความรู้</span>
            </button>

            {/* 3. องค์กร & B2B (Visible to: OPERATOR & ADMINISTRATOR ONLY) */}
            {(isOperator || isAdmin) && (
              <button
                id="nav-tab-b2b"
                onClick={() => onSelectTab('b2b')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTab === 'b2b'
                    ? 'bg-[#1B3D2F] text-white shadow-xs font-semibold'
                    : 'text-[#415649] hover:bg-[#F2EFE8] hover:text-[#1B3D2F]'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-[#E8C57D] shrink-0" />
                <span className="whitespace-nowrap">องค์กร & B2B</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold whitespace-nowrap ${
                  activeTab === 'b2b' ? 'bg-white/20 text-[#FFF7E8]' : 'bg-[#E5EFE0] text-[#1E5D34]'
                }`}>
                  101
                </span>
              </button>
            )}

            {/* 4. ประวัติ Logs (Visible to: OPERATOR & ADMINISTRATOR ONLY) */}
            {(isOperator || isAdmin) && (
              <button
                id="nav-tab-history"
                onClick={() => onSelectTab('sheets')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTab === 'sheets'
                    ? 'bg-[#1B3D2F] text-white shadow-xs font-semibold'
                    : 'text-[#415649] hover:bg-[#F2EFE8] hover:text-[#1B3D2F]'
                }`}
              >
                <History className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">ประวัติ</span>
              </button>
            )}

            {/* 5. จัดการสิทธิ์ (Visible to: ADMINISTRATOR ONLY) */}
            {isAdmin && (
              <button
                id="nav-tab-users-admin"
                onClick={() => onSelectTab('users')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap border ml-0.5 ${
                  activeTab === 'users'
                    ? 'bg-[#8C5E1B] text-white border-[#754E15] shadow-xs'
                    : 'bg-[#FEF8ED] text-[#8C5E1B] border-[#F1DEC0] hover:bg-[#FBF0DB]'
                }`}
                title="จัดการบัญชีผู้ใช้ สิทธิ์ และแผนก"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#E8C57D] shrink-0" />
                <span className="whitespace-nowrap">จัดการสิทธิ์</span>
              </button>
            )}
          </div>

          {/* Consolidated Sheets & Data Menu (Operator & Admin Only) */}
          {(isOperator || isAdmin) && (
            <div className="relative">
              <button
                id="header-data-menu-btn"
                onClick={() => {
                  setShowDataMenu(!showDataMenu);
                  setShowMenu(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 whitespace-nowrap border ${
                  sheetsDbConfig
                    ? 'bg-[#EBF7EE] text-[#136C36] border-[#B7E2BF] hover:bg-[#DCF3E2]'
                    : 'bg-[#FAF8F3] text-[#425547] border-[#DDD7C8] hover:bg-[#F2ECE0]'
                }`}
                title="เชื่อมต่อฐานข้อมูล Google Sheets และการนำเข้าข้อมูล"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#107C41] shrink-0" />
                <span className="hidden lg:inline text-xs font-semibold">Sheets DB</span>
                {(sheetsDbConfig) ? (
                  <span className="w-2 h-2 rounded-full bg-[#107C41] shrink-0 ring-2 ring-[#EBF7EE]" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A8B2A6] shrink-0" />
                )}
                <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
              </button>

              {/* Data Tools Popover Dropdown */}
              {showDataMenu && (
                <div 
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#E5DFD1] py-2 z-50 animate-in fade-in zoom-in-95"
                >
                  <div className="px-3.5 py-2 border-b border-[#F0ECE1] bg-[#FAF8F3]/70">
                    <div className="text-[11px] font-bold text-[#1B3D2F] flex items-center justify-between">
                      <span>จัดการข้อมูล Google Sheets</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#E8F3EB] text-[#1B5233]">
                        Workspace
                      </span>
                    </div>
                  </div>

                  <div className="p-1.5 space-y-1">
                    {/* Option 1: Live Database (Questions & B2B) */}
                    {onOpenGoogleSheetsDbModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowDataMenu(false);
                          onOpenGoogleSheetsDbModal();
                        }}
                        className="w-full flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-[#F5F8F4] text-left transition-colors cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#EAF7ED] text-[#107C41] flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-[#1B3D2F] flex items-center gap-1.5">
                            <span>ฐานข้อมูล Google Sheets</span>
                            {sheetsDbConfig && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#107C41] text-white font-medium">
                                เชื่อมต่อแล้ว
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#697E72] mt-0.5 leading-tight">
                            บันทึกคำถามพนักงาน & การนัดหมาย B2B แบบ Real-time
                          </p>
                        </div>
                      </button>
                    )}

                    {/* Option 2: Knowledge Base Sync */}
                    {onOpenSheetsSync && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowDataMenu(false);
                          onOpenSheetsSync();
                        }}
                        className="w-full flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-[#F5F8F4] text-left transition-colors cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#FAF3E5] text-[#8C6418] flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-[#1B3D2F] flex items-center gap-1.5">
                            <span>นำเข้าฐานความรู้ (Sync)</span>
                            {isUsingCustomSheet && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#8C6418] text-white font-medium">
                                ชีตกำหนดเอง
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#697E72] mt-0.5 leading-tight">
                            ซิงค์ข้อมูล Q&A จาก Google Sheets หรือไฟล์ Excel / CSV
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile Dropdown & Account Switcher */}
          <div className="relative shrink-0">
            <button
              id="user-profile-menu-btn"
              onClick={() => {
                setShowMenu(!showMenu);
                setShowDataMenu(false);
              }}
              className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-1.5 pr-2 sm:pr-2.5 py-1 rounded-full bg-[#FAF8F3] hover:bg-[#F1EDE2] text-[#1B3D2F] border border-[#E5DFD1] transition-all cursor-pointer shrink-0"
              title="โปรไฟล์ผู้ใช้และสลับบัญชี"
            >
              <span className="w-6 h-6 rounded-full bg-[#E5EFE2] text-xs flex items-center justify-center font-bold shrink-0 border border-[#D5E5D1]">
                {currentStaff.avatar || '👩🏻‍💼'}
              </span>
              <div className="flex flex-col text-left leading-tight hidden sm:block">
                <span className="text-xs font-semibold truncate max-w-[85px] lg:max-w-[110px]">
                  {currentStaff.name}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${
                  isAdmin ? 'text-[#9A5B08]' : isOperator ? 'text-[#1E4E8C]' : 'text-[#1E6038]'
                }`}>
                  {currentRole === 'Knowledge User' ? 'User' : currentRole === 'Administrator' ? 'Admin' : 'Operator'}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-[#7B8F81] shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div 
                className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#E5DFD1] py-2 z-50 animate-in fade-in zoom-in-95"
              >
                {/* Current Active Staff Info */}
                <div className="px-4 py-3 border-b border-[#F0ECE1] bg-[#FAF8F3]/70 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#8C7A4A] uppercase tracking-wider">
                      ผู้ใช้งานขณะนี้
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${rolePermissions.badgeBg} ${rolePermissions.badgeText} ${rolePermissions.badgeBorder}`}
                    >
                      {currentRole}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-[#1B3D2F] mt-1.5 flex items-center gap-2">
                    <span className="text-lg">{currentStaff.avatar || '🧑🏻‍💼'}</span>
                    <div>
                      <div>{currentStaff.name}</div>
                      {currentStaff.username && (
                        <div className="text-[11px] font-mono text-[#6F8274]">
                          @{currentStaff.username}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-[#5D7063] mt-1">
                    {currentStaff.department}
                  </div>

                  {/* Switch Account Button */}
                  {onEditProfile && (
                    <button
                      id="header-open-login-portal-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onEditProfile();
                      }}
                      className="mt-2.5 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#1E4332] to-[#153526] hover:from-[#173829] hover:to-[#0F281C] text-[#F1DCB0] text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer border border-[#E8C57D]/30"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#E8C57D]" />
                      <span>สลับบัญชี / ทดสอบ 3 ระดับสิทธิ์</span>
                    </button>
                  )}
                </div>

                {/* ROLE RESTRICTED TOOLS IN MENU */}
                {/* ADMIN TOOLS */}
                {isAdmin && (
                  <div className="mt-1 pt-1 border-b border-[#F0ECE1] px-1 pb-1">
                    <div className="px-3 py-1 text-[10px] font-bold text-[#9A5B08] uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>เมนูผู้ดูแลระบบ (Admin Only)</span>
                    </div>

                    <button
                      id="menu-goto-users-admin"
                      onClick={() => {
                        setShowMenu(false);
                        onSelectTab('users');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs text-[#2A4032] hover:bg-[#FEF6E8] transition-colors cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-[#9A5B08]" />
                      <div>
                        <div className="font-bold text-[#9A5B08]">จัดการผู้ใช้ 3 ระดับ & Audit Logs</div>
                        <div className="text-[10px] text-[#697E70]">เพิ่ม/ปิดบัญชี, เปลี่ยน Role, Reset Pass</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onSelectTab('arch');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs text-[#2A4032] hover:bg-[#F2EFE8] transition-colors cursor-pointer"
                    >
                      <Layers className="w-4 h-4 text-[#446654]" />
                      <div>
                        <div className="font-semibold leading-tight">สถาปัตยกรรมระบบ</div>
                        <div className="text-[10px] text-[#697E70]">Google Docs & Sheets Flow</div>
                      </div>
                    </button>
                  </div>
                )}

                {/* OPERATOR / ADMIN SHARED TOOLS */}
                {(isOperator || isAdmin) && (
                  <div className="px-1 py-1 border-b border-[#F0ECE1]">
                    <div className="px-3 py-1 text-[10px] font-semibold text-[#8C9E90] uppercase tracking-wider">
                      เครื่องมือปฏิบัติการ (Operator / Admin)
                    </div>

                    {onOpenSheetsSync && (
                      <button
                        id="menu-data-import-btn"
                        onClick={() => {
                          setShowMenu(false);
                          onOpenSheetsSync();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl flex items-center justify-between text-xs text-[#2A4032] hover:bg-[#FBF6EA] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <FileSpreadsheet className="w-4 h-4 text-[#8C6418]" />
                          <div>
                            <div className="font-bold text-[#8C6418] flex items-center gap-1.5">
                              <span>ระบบนำเข้าข้อมูล (Google Sheets)</span>
                              {isUsingCustomSheet && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#136C36] text-white">
                                  ใช้งานอยู่
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#697E70]">
                              ซิงค์ Google Sheets หรืออัปโหลดไฟล์ CSV / Excel
                            </div>
                          </div>
                        </div>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onSelectTab('sheets');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs text-[#2A4032] hover:bg-[#EEF5EC] transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-[#107C41]" />
                      <div>
                        <div className="font-semibold leading-tight">ประวัติการค้นหา (Logs)</div>
                        <div className="text-[10px] text-[#697E70]">บันทึกและดาวน์โหลด Excel</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onSelectTab('unanswered');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl flex items-center justify-between text-xs text-[#2A4032] hover:bg-[#FAF2E6] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <HelpCircle className="w-4 h-4 text-[#B07219]" />
                        <div>
                          <div className="font-semibold leading-tight">คำถามรออัปเดต Docs</div>
                          <div className="text-[10px] text-[#697E70]">Unanswered Questions</div>
                        </div>
                      </div>
                      {unansweredCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D9534F] text-white">
                          {unansweredCount}
                        </span>
                      )}
                    </button>
                  </div>
                )}

                {/* KNOWLEDGE USER NOTICE */}
                {isKnowledgeUser && (
                  <div className="p-3 mx-2 my-1 rounded-xl bg-[#FAF8F5] border border-[#E5E0D5] text-xs text-[#5A6E60]">
                    <div className="font-bold text-[#1E6038] flex items-center gap-1 mb-0.5">
                      <Key className="w-3.5 h-3.5" />
                      <span>สิทธิ์ Knowledge User</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      คุณสามารถสืบค้นถาม-ตอบ และศึกษาคู่มือเอกสาร หากต้องการเข้าถึงเมนู B2B หรือระบบจัดการ กรุณาติดต่อ Administrator
                    </p>
                  </div>
                )}

                {/* LOGOUT BUTTON */}
                <div className="px-2 pt-2">
                  <button
                    id="header-logout-btn"
                    onClick={() => {
                      setShowMenu(false);
                      if (onLogout) {
                        onLogout();
                      } else if (onEditProfile) {
                        onEditProfile();
                      }
                    }}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold text-[#B8324E] hover:bg-[#FDECEE] border border-transparent hover:border-[#F7BFC9] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>ออกจากระบบ (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
