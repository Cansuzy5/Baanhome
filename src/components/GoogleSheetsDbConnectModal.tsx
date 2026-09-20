import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Link as LinkIcon,
  X,
  ShieldCheck,
  ShieldAlert,
  Download,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import {
  signInWithGoogleWorkspace,
  signOutGoogleWorkspace,
  getGoogleAccessToken,
  getCachedGoogleUser,
} from '../utils/googleWorkspaceAuth';
import {
  GoogleSheetsDbConfig,
  getStoredSheetsConfig,
  saveStoredSheetsConfig,
  createDatabaseSpreadsheet,
  syncAllQuestionsToGoogleSheet,
  syncAllAppointmentsToGoogleSheet,
  extractSpreadsheetId,
  exportQuestionLogsToCSV,
  exportAppointmentsToCSV,
} from '../utils/googleSheetsDatabase';
import { QuestionLog, B2BAppointment, StaffProfile, UserRole } from '../types';
import { getActiveSessionUser } from '../utils/authService';
import { canUserManageSystem } from '../utils/b2bService';

interface GoogleSheetsDbConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionLogs: QuestionLog[];
  appointments: B2BAppointment[];
  onConfigChange?: (config: GoogleSheetsDbConfig | null) => void;
  currentUser?: StaffProfile | null;
}

export const GoogleSheetsDbConnectModal: React.FC<GoogleSheetsDbConnectModalProps> = ({
  isOpen,
  onClose,
  questionLogs,
  appointments,
  onConfigChange,
  currentUser,
}) => {
  const activeUser = currentUser || getActiveSessionUser();
  const currentRole: UserRole = activeUser?.role || 'Knowledge User';
  const isAdmin = canUserManageSystem(currentRole);

  const [googleUser, setGoogleUser] = useState(getCachedGoogleUser);
  const [config, setConfig] = useState<GoogleSheetsDbConfig | null>(getStoredSheetsConfig);

  // Direct URL / ID form state
  const [directUrlInput, setDirectUrlInput] = useState('');
  const [directTitleInput, setDirectTitleInput] = useState('');
  const [isSavingDirect, setIsSavingDirect] = useState(false);

  // Advanced section collapse toggle
  const [showAdvancedOAuth, setShowAdvancedOAuth] = useState(false);

  // Loading states for optional Google Workspace actions
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncingData, setIsSyncingData] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'ยืนยัน',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (isOpen) {
      const currentConfig = getStoredSheetsConfig();
      setConfig(currentConfig);
      setGoogleUser(getCachedGoogleUser());
      setStatusMessage(null);

      if (currentConfig) {
        setDirectUrlInput(currentConfig.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${currentConfig.spreadsheetId}/edit`);
        setDirectTitleInput(currentConfig.spreadsheetTitle || '');
      } else {
        setDirectUrlInput('');
        setDirectTitleInput('');
      }

      // Fetch central sheets config from server / Firestore
      fetch('/api/sync/sheets-config')
        .then((res) => res.json())
        .then((data) => {
          if (data && 'config' in data) {
            setConfig(data.config);
            if (data.config) {
              setDirectUrlInput(data.config.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.config.spreadsheetId}/edit`);
              setDirectTitleInput(data.config.spreadsheetTitle || '');
              localStorage.setItem('baanhome_google_sheets_db_config', JSON.stringify(data.config));
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Direct Save via Link (No OAuth required)
  const handleSaveDirectLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setStatusMessage({
        type: 'error',
        text: 'สิทธิ์ไม่เพียงพอ: เฉพาะ Administrator เท่านั้นที่สามารถเปลี่ยนลิงก์ฐานข้อมูลกลางได้',
      });
      return;
    }

    const trimmed = directUrlInput.trim();
    if (!trimmed) {
      setStatusMessage({ type: 'error', text: 'กรุณาวาง URL ของ Google Spreadsheet หรือ Sheet ID' });
      return;
    }

    const sheetId = extractSpreadsheetId(trimmed);
    if (!sheetId) {
      setStatusMessage({
        type: 'error',
        text: 'รูปแบบลิงก์ไม่ถูกต้อง กรุณาวาง URL ของ Google Sheets (เช่น https://docs.google.com/spreadsheets/d/.../edit)',
      });
      return;
    }

    try {
      setIsSavingDirect(true);
      const title = directTitleInput.trim() || 'ฐานข้อมูล Google Sheets บ้านโฮม';
      const url = trimmed.startsWith('http')
        ? trimmed
        : `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;

      const newConfig: GoogleSheetsDbConfig = {
        spreadsheetId: sheetId,
        spreadsheetTitle: title,
        spreadsheetUrl: url,
        autoSyncQuestions: true,
        autoSyncB2B: true,
        lastSyncedAt: new Date().toLocaleString('th-TH'),
        connectedEmail: googleUser?.email || '',
      };

      saveStoredSheetsConfig(newConfig);
      setConfig(newConfig);
      if (onConfigChange) onConfigChange(newConfig);

      setStatusMessage({
        type: 'success',
        text: 'บันทึกฐานข้อมูลกลางสำเร็จ! ข้อมูลนี้จะซิงค์ตรงกันทุกเครื่องและทุกผู้ใช้ทันที ✨',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'เกิดข้อผิดพลาดในการบันทึกฐานข้อมูล',
      });
    } finally {
      setIsSavingDirect(false);
    }
  };

  // Disconnect Database
  const handleDisconnect = () => {
    if (!isAdmin) {
      setStatusMessage({
        type: 'error',
        text: 'สิทธิ์ไม่เพียงพอ: เฉพาะ Administrator เท่านั้นที่สามารถยกเลิกการเชื่อมต่อฐานข้อมูลได้',
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'ยกเลิกการเชื่อมต่อฐานข้อมูล Google Sheets',
      message: 'ต้องการยกเลิกการเชื่อมต่อฐานข้อมูลนี้ใช่หรือไม่? ระบบจะกลับไปใช้ฐานข้อมูลภายในระบบชั่วคราว',
      confirmText: 'ยกเลิกเชื่อมต่อ',
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        saveStoredSheetsConfig(null);
        setConfig(null);
        setDirectUrlInput('');
        setDirectTitleInput('');
        if (onConfigChange) onConfigChange(null);
        setStatusMessage({ type: 'info', text: 'ยกเลิกการเชื่อมต่อ Google Sheets เรียบร้อยแล้ว' });
      },
    });
  };

  // Optional: Sign in with Google
  const handleSignIn = async () => {
    setIsSigningIn(true);
    setStatusMessage(null);
    try {
      const res = await signInWithGoogleWorkspace();
      setGoogleUser(res.user);
      setStatusMessage({
        type: 'success',
        text: `เชื่อมต่อบัญชี Google (${res.user.email}) เรียบร้อยแล้ว`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'ไม่สามารถเชื่อมต่อ Google ได้' });
    } finally {
      setIsSigningIn(false);
    }
  };

  // Optional: Sign out from Google
  const handleSignOut = async () => {
    await signOutGoogleWorkspace();
    setGoogleUser(null);
    setStatusMessage({ type: 'info', text: 'ออกจากระบบ Google Workspace เรียบร้อยแล้ว' });
  };

  // Optional: Auto-create sheet via Google Workspace API
  const handleCreateAutoSheet = async () => {
    const token = await getGoogleAccessToken();
    if (!token) {
      setStatusMessage({
        type: 'error',
        text: 'กรุณาเข้าสู่ระบบ Google Workspace ก่อนสร้างชีตอัตโนมัติ',
      });
      return;
    }

    try {
      setIsCreatingSheet(true);
      setStatusMessage({ type: 'info', text: 'กำลังสร้างและจัดรูปแบบ Google Sheets ใน Google Drive ของคุณ...' });
      const newSheet = await createDatabaseSpreadsheet(token);

      const newConfig: GoogleSheetsDbConfig = {
        spreadsheetId: newSheet.spreadsheetId,
        spreadsheetTitle: newSheet.title,
        spreadsheetUrl: newSheet.spreadsheetUrl,
        autoSyncQuestions: true,
        autoSyncB2B: true,
        lastSyncedAt: new Date().toLocaleString('th-TH'),
        connectedEmail: googleUser?.email || '',
      };

      saveStoredSheetsConfig(newConfig);
      setConfig(newConfig);
      setDirectUrlInput(newSheet.spreadsheetUrl);
      setDirectTitleInput(newSheet.title);
      if (onConfigChange) onConfigChange(newConfig);

      setStatusMessage({
        type: 'success',
        text: 'สร้าง Google Sheets ฐานข้อมูลสำเร็จและเชื่อมต่อเรียบร้อยแล้ว!',
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการสร้าง Google Sheets' });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Optional: Direct Push Sync to Google Sheets
  const handlePushAllToSheet = async () => {
    if (!config?.spreadsheetId) return;
    const token = await getGoogleAccessToken();
    if (!token) {
      setStatusMessage({
        type: 'error',
        text: 'กรุณาเข้าสู่ระบบ Google Workspace ก่อนเพื่อรับสิทธิ์เขียนข้อมูลลงในชีต',
      });
      return;
    }

    try {
      setIsSyncingData(true);
      setStatusMessage({ type: 'info', text: 'กำลังเขียนข้อมูลคำถามและนัดหมายลง Google Sheets...' });
      const qCount = await syncAllQuestionsToGoogleSheet(token, config.spreadsheetId, questionLogs);
      const aCount = await syncAllAppointmentsToGoogleSheet(token, config.spreadsheetId, appointments);

      setStatusMessage({
        type: 'success',
        text: `เขียนข้อมูลลง Google Sheets สำเร็จ! (คำถาม ${qCount} ข้อ, นัดหมาย ${aCount} รายการ)`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'การเขียนข้อมูลลงชีตไม่สำเร็จ' });
    } finally {
      setIsSyncingData(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#E5E0D5] animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto space-y-5">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E0D5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF5EC] text-[#1B3D2F] flex items-center justify-center shadow-xs border border-[#CDE5D2]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-[#1B3D2F] text-lg sm:text-xl">
                  ฐานข้อมูลกลาง Google Sheets
                </h2>
                {isAdmin ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF7EE] text-[#1E6038] border border-[#BDE5C8] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    ผู้ดูแลระบบ (Admin)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    ดูอย่างเดียว (Read-only)
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6F8274]">
                เชื่อมโยงและซิงค์ข้อมูลคำถามพนักงาน & การนัดหมาย B2B แสดงผลตรงกันทุกเครื่อง
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#889E90] hover:text-[#1B3D2F] p-1.5 rounded-xl hover:bg-[#F2EFE8] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message Banner */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 border ${
              statusMessage.type === 'success'
                ? 'bg-[#EBF7EE] text-[#1E6038] border-[#BDE5C8]'
                : statusMessage.type === 'error'
                ? 'bg-[#FDECEE] text-[#B8324E] border-[#F7BFC9]'
                : 'bg-[#EBF3FC] text-[#1E4E8C] border-[#BAD7F9]'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* CURRENT ACTIVE CONNECTION STATUS */}
        {config?.spreadsheetId ? (
          <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-[#DCE8DB] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-xs text-[#1E6038]">
                  เชื่อมต่อฐานข้อมูลกลางเรียบร้อยแล้ว
                </span>
              </div>
              {config.lastSyncedAt && (
                <span className="text-[11px] text-[#6F8274]">
                  อัปเดตล่าสุด: {config.lastSyncedAt}
                </span>
              )}
            </div>

            <div className="bg-white p-3 rounded-xl border border-[#E5E0D5] flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="font-bold text-sm text-[#1B3D2F]">
                  {config.spreadsheetTitle || 'ฐานข้อมูล Google Sheets'}
                </div>
                <div className="text-[11px] text-[#718578] font-mono truncate max-w-xs sm:max-w-md">
                  ID: {config.spreadsheetId}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={config.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-[#1B3D2F] hover:bg-[#122E21] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิดดูใน Google Sheets</span>
                </a>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="p-1.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                    title="ยกเลิกการเชื่อมต่อ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
            <div>
              <span className="font-bold">ยังไม่มีการระบุลิงก์ Google Sheets ส่วนกลาง</span>
              <p className="text-[11px] text-amber-800 mt-0.5">
                {isAdmin
                  ? 'คุณสามารถนำลิงก์ Google Sheets ของรีสอร์ทมาวางด้านล่างได้ทันที เพื่อให้พนักงานทุกคนและระบบ Vercel ซิงค์ข้อมูลตรงกัน'
                  : 'ขณะนี้ระบบกำลังใช้งานฐานข้อมูลภายในชั่วคราว ติดต่อผู้ดูแลระบบ (Administrator) หากต้องการเปลี่ยนลิงก์ Google Sheets'}
              </p>
            </div>
          </div>
        )}

        {/* PRIMARY ACTION: DIRECT LINK FORM (วางลิงก์ Google Sheets โดยตรง) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#DCE8DB] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-[#1E6038]" />
              <h3 className="font-bold text-sm text-[#1B3D2F]">
                วางลิงก์ Google Sheets โดยตรง (Direct URL)
              </h3>
            </div>
            {!isAdmin && (
              <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                🔒 ล็อค (เฉพาะ Admin แก้ไขได้)
              </span>
            )}
          </div>

          <p className="text-xs text-[#5D7364] leading-relaxed">
            คัดลอก URL ของ Google Spreadsheet มาวางได้ทันที ไม่ต้องล็อกอินหรือขอรหัสผ่าน{' '}
            <span className="text-[#1E6038] font-semibold">
              (แนะนำให้ตั้งค่าใน Google Sheets ให้ "ทุกคนที่มีลิงก์มีสิทธิ์อ่านหรือแก้ไขได้")
            </span>
          </p>

          <form onSubmit={handleSaveDirectLink} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#1B3D2F] mb-1">
                URL ของ Google Spreadsheet หรือ Sheet ID
              </label>
              <input
                type="text"
                disabled={!isAdmin || isSavingDirect}
                value={directUrlInput}
                onChange={(e) => setDirectUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5n.../edit"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono transition-all ${
                  !isAdmin
                    ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                    : 'bg-white border-[#C9DEC8] focus:border-[#1E6038] focus:ring-2 focus:ring-[#1E6038]/20'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1B3D2F] mb-1">
                ชื่อเรียกฐานข้อมูล (ทางเลือก)
              </label>
              <input
                type="text"
                disabled={!isAdmin || isSavingDirect}
                value={directTitleInput}
                onChange={(e) => setDirectTitleInput(e.target.value)}
                placeholder="เช่น ฐานข้อมูลคำถามและนัดหมาย บ้านโฮม รีสอร์ท"
                className={`w-full px-3.5 py-2 rounded-xl border text-xs transition-all ${
                  !isAdmin
                    ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                    : 'bg-white border-[#C9DEC8] focus:border-[#1E6038] focus:ring-2 focus:ring-[#1E6038]/20'
                }`}
              />
            </div>

            {isAdmin ? (
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={isSavingDirect || !directUrlInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#1E6038] hover:bg-[#154728] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingDirect ? 'กำลังบันทึก...' : '💾 บันทึกเป็นฐานข้อมูลกลาง (ทุกคนใช้ร่วมกัน)'}</span>
                </button>

                {config && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold underline cursor-pointer"
                  >
                    ยกเลิกการเชื่อมต่อ
                  </button>
                )}
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-[#F5F2EB] text-[#695D47] text-xs flex items-center gap-2 border border-[#E5DFD1]">
                <ShieldAlert className="w-4 h-4 text-[#8C7A58] shrink-0" />
                <span>
                  เฉพาะผู้ดูแลระบบ (Administrator) เท่านั้นที่สามารถเปลี่ยนลิงก์ฐานข้อมูลกลางได้
                  หากต้องการเปลี่ยนแปลง กรุณาแจ้ง Admin
                </span>
              </div>
            )}
          </form>
        </div>

        {/* DATA EXPORT (DOWNLOAD CSV FOR DIRECT IMPORT) */}
        <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-[#E5E0D5] space-y-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-[#1B3D2F]" />
            <h3 className="font-bold text-xs sm:text-sm text-[#1B3D2F]">
              ดาวน์โหลดข้อมูลสำรอง (CSV) นำไปเปิดใน Google Sheets หรือ Excel
            </h3>
          </div>
          <p className="text-[11px] text-[#6F8274]">
            สามารถดาวน์โหลดข้อมูลทั้งหมดไปเปิดในตารางได้ทันทีโดยไม่ต้องเชื่อมต่อระบบ
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={() => exportQuestionLogsToCSV(questionLogs)}
              className="p-3 rounded-xl bg-white hover:bg-[#F2EFE8] border border-[#DDD7CB] text-[#1B3D2F] text-xs font-bold flex items-center justify-between gap-2 shadow-2xs transition-colors cursor-pointer"
            >
              <span>📥 ประวัติคำถามพนักงาน ({questionLogs.length})</span>
              <span className="text-[10px] text-[#788E7D] font-mono">.CSV</span>
            </button>

            <button
              onClick={() => exportAppointmentsToCSV(appointments)}
              className="p-3 rounded-xl bg-white hover:bg-[#F2EFE8] border border-[#DDD7CB] text-[#1B3D2F] text-xs font-bold flex items-center justify-between gap-2 shadow-2xs transition-colors cursor-pointer"
            >
              <span>📥 ตารางนัดหมาย B2B ({appointments.length})</span>
              <span className="text-[10px] text-[#788E7D] font-mono">.CSV</span>
            </button>
          </div>
        </div>

        {/* OPTIONAL / ADVANCED: GOOGLE WORKSPACE OAUTH & AUTO-CREATE (ACCORDION) */}
        <div className="border border-[#E5E0D5] rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvancedOAuth(!showAdvancedOAuth)}
            className="w-full p-3.5 bg-[#FAF9F6] hover:bg-[#F2EFE8] text-left flex items-center justify-between transition-colors cursor-pointer text-xs font-bold text-[#1B3D2F]"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C59B3F]" />
              <span>ตัวเลือกเสริมสำหรับผู้ดูแลระบบ: เชื่อมต่อ Google Workspace เพื่อสร้างตารางอัตโนมัติ</span>
            </div>
            {showAdvancedOAuth ? <ChevronUp className="w-4 h-4 text-[#7A9180]" /> : <ChevronDown className="w-4 h-4 text-[#7A9180]" />}
          </button>

          {showAdvancedOAuth && (
            <div className="p-4 bg-white border-t border-[#E5E0D5] space-y-4 text-xs">
              <p className="text-[#6F8274] leading-relaxed">
                ตัวเลือกนี้เป็นทางเลือกเสริมสำหรับ Administrator ที่ต้องการให้ระบบ "สร้างไฟล์ Google Sheets ให้อัตโนมัติ" ใน Google Drive ของคุณเอง หรือกดส่งข้อมูลขึ้นตารางอัตโนมัติ
              </p>

              <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E8E3D8] flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-bold text-[#1B3D2F]">
                    สถานะการเชื่อมต่อบัญชี Google
                  </div>
                  <div className="text-[11px] text-[#6F8274]">
                    {googleUser ? `เข้าสู่ระบบแล้ว: ${googleUser.email}` : 'ยังไม่ได้เข้าสู่ระบบ Google Workspace'}
                  </div>
                </div>

                {googleUser ? (
                  <button
                    onClick={handleSignOut}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>ออกจากระบบ</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="px-4 py-2 rounded-xl bg-[#1B3D2F] hover:bg-[#122E21] text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>{isSigningIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ Google'}</span>
                  </button>
                )}
              </div>

              {isAdmin && googleUser && (
                <div className="pt-2 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCreateAutoSheet}
                    disabled={isCreatingSheet}
                    className="px-4 py-2 rounded-xl bg-[#1E6038] hover:bg-[#154728] text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isCreatingSheet ? 'กำลังสร้างชีต...' : 'สร้าง Google Sheets ใหม่ให้อัตโนมัติ'}</span>
                  </button>

                  {config?.spreadsheetId && (
                    <button
                      type="button"
                      onClick={handlePushAllToSheet}
                      disabled={isSyncingData}
                      className="px-4 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F0EBE0] border border-[#DDD7CB] text-[#1B3D2F] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingData ? 'animate-spin' : ''}`} />
                      <span>{isSyncingData ? 'กำลังซิงค์...' : 'ส่งข้อมูลทั้งหมดลงชีตตอนนี้'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-[#E5E0D5] flex items-center justify-between text-xs text-[#718578]">
          <span>
            ซิงค์อัตโนมัติผ่านคลาวด์กลาง &middot; Vercel & GitHub Ready
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#F0ECE1] hover:bg-[#E2DDD0] text-[#1B3D2F] font-bold cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#E5E0D5] space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-sm text-[#1B3D2F]">{confirmDialog.title}</h3>
            <p className="text-xs text-[#5D7364] leading-relaxed">{confirmDialog.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-1.5 rounded-xl bg-[#F2EFE8] hover:bg-[#E5E0D5] text-[#1B3D2F] text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-3.5 py-1.5 rounded-xl bg-[#B8324E] hover:bg-[#9E2840] text-white text-xs font-bold cursor-pointer"
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
