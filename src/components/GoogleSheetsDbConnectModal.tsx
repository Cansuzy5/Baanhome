import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Link,
  X,
  Database,
  ArrowRight,
  ShieldCheck,
  Calendar,
  HelpCircle,
  Sliders,
  LogOut,
  Download
} from 'lucide-react';
import {
  signInWithGoogleWorkspace,
  signOutGoogleWorkspace,
  getGoogleAccessToken,
  getCachedGoogleUser
} from '../utils/googleWorkspaceAuth';
import {
  GoogleSheetsDbConfig,
  getStoredSheetsConfig,
  saveStoredSheetsConfig,
  createDatabaseSpreadsheet,
  syncAllQuestionsToGoogleSheet,
  syncAllAppointmentsToGoogleSheet,
  verifySpreadsheetAccess
} from '../utils/googleSheetsDatabase';
import { QuestionLog, B2BAppointment } from '../types';

interface GoogleSheetsDbConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionLogs: QuestionLog[];
  appointments: B2BAppointment[];
  onConfigChange?: (config: GoogleSheetsDbConfig | null) => void;
}

export const GoogleSheetsDbConnectModal: React.FC<GoogleSheetsDbConnectModalProps> = ({
  isOpen,
  onClose,
  questionLogs,
  appointments,
  onConfigChange,
}) => {
  const [googleUser, setGoogleUser] = useState(getCachedGoogleUser);
  const [config, setConfig] = useState<GoogleSheetsDbConfig | null>(getStoredSheetsConfig);
  
  // Loading & Action states
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncingQuestions, setIsSyncingQuestions] = useState(false);
  const [isSyncingB2B, setIsSyncingB2B] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Manual Sheet ID Input state
  const [isManualInputMode, setIsManualInputMode] = useState(false);
  const [manualSheetInput, setManualSheetInput] = useState('');
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);

  // Confirmation dialog for sync/create operations
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
      setGoogleUser(getCachedGoogleUser());
      setConfig(getStoredSheetsConfig());
      setStatusMessage(null);

      // Fetch central sheets config from server
      fetch('/api/sync/sheets-config')
        .then((res) => res.json())
        .then((data) => {
          if (data && 'config' in data) {
            setConfig(data.config);
            if (data.config) {
              localStorage.setItem('baanhome_google_sheets_db_config', JSON.stringify(data.config));
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Google Sign In
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อ Google ได้';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSigningIn(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    await signOutGoogleWorkspace();
    setGoogleUser(null);
    setStatusMessage({ type: 'info', text: 'ออกจากระบบ Google Workspace เรียบร้อยแล้ว' });
  };

  // Trigger Creation of Google Spreadsheet
  const handleTriggerCreate = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'สร้าง Google Sheets ฐานข้อมูลใหม่',
      message:
        'ระบบจะสร้างไฟล์ Google Spreadsheet ชื่อ "บ้านโฮม - ฐานข้อมูลคำถามพนักงาน & นัดหมาย B2B" ใน Google Drive ของคุณ โดยมี 2 แผ่นงาน (คำถามพนักงาน และ การนัดหมาย B2B) พร้อมจัดรูปแบบตารางอัตโนมัติ ต้องการดำเนินการหรือไม่?',
      confirmText: 'สร้างทันที',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await executeCreateSpreadsheet();
      },
    });
  };

  const executeCreateSpreadsheet = async () => {
    const token = await getGoogleAccessToken();
    if (!token) {
      setStatusMessage({
        type: 'error',
        text: 'กรุณาเข้าสู่ระบบ Google เพื่อรับสิทธิ์การสร้าง Google Sheets',
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
      if (onConfigChange) onConfigChange(newConfig);

      setStatusMessage({
        type: 'success',
        text: 'สร้าง Google Sheets ฐานข้อมูลสำเร็จและเชื่อมต่อเรียบร้อยแล้ว!',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้าง Google Sheets';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Verify and Connect existing Sheet
  const handleConnectExistingSheet = async () => {
    if (!manualSheetInput.trim()) {
      setStatusMessage({ type: 'error', text: 'กรุณาระบุ Google Sheet ID หรือ URL' });
      return;
    }

    const token = await getGoogleAccessToken();
    if (!token) {
      setStatusMessage({ type: 'error', text: 'กรุณาเข้าสู่ระบบ Google ก่อน' });
      return;
    }

    // Extract ID if full URL
    let extractedId = manualSheetInput.trim();
    const match = extractedId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      extractedId = match[1];
    }

    try {
      setIsVerifyingManual(true);
      const meta = await verifySpreadsheetAccess(token, extractedId);

      const newConfig: GoogleSheetsDbConfig = {
        spreadsheetId: extractedId,
        spreadsheetTitle: meta.title,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${extractedId}/edit`,
        autoSyncQuestions: true,
        autoSyncB2B: true,
        lastSyncedAt: new Date().toLocaleString('th-TH'),
        connectedEmail: googleUser?.email || '',
      };

      saveStoredSheetsConfig(newConfig);
      setConfig(newConfig);
      if (onConfigChange) onConfigChange(newConfig);
      setIsManualInputMode(false);
      setManualSheetInput('');
      setStatusMessage({
        type: 'success',
        text: `เชื่อมต่อ Google Sheet "${meta.title}" สำเร็จ!`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อกับ Sheet นี้ได้';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsVerifyingManual(false);
    }
  };

  // Sync Questions confirmation
  const handleTriggerSyncQuestions = () => {
    if (!config) return;
    setConfirmDialog({
      isOpen: true,
      title: 'ซิงค์ประวัติคำถามพนักงานลง Google Sheets',
      message: `ต้องการเขียนข้อมูลคำถามของพนักงานทั้งหมด (${questionLogs.length} รายการ) ลงในแผ่นงาน "คำถามพนักงาน" ของ Google Sheets ใช่หรือไม่?`,
      confirmText: 'ซิงค์ข้อมูล',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await executeSyncQuestions();
      },
    });
  };

  const executeSyncQuestions = async () => {
    if (!config) return;
    const token = await getGoogleAccessToken();
    if (!token) {
      setStatusMessage({ type: 'error', text: 'กรุณาเข้าสู่ระบบ Google เพื่อซิงค์ข้อมูล' });
      return;
    }

    try {
      setIsSyncingQuestions(true);
      const count = await syncAllQuestionsToGoogleSheet(token, config.spreadsheetId, questionLogs);
      
      const updatedConfig = {
        ...config,
        lastSyncedAt: new Date().toLocaleString('th-TH'),
      };
      saveStoredSheetsConfig(updatedConfig);
      setConfig(updatedConfig);
      if (onConfigChange) onConfigChange(updatedConfig);

      setStatusMessage({
        type: 'success',
        text: `ซิงค์คำถามพนักงาน ${count} รายการลง Google Sheets สำเร็จ!`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการซิงค์คำถาม';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSyncingQuestions(false);
    }
  };

  // Sync B2B Appointments confirmation
  const handleTriggerSyncB2B = () => {
    if (!config) return;
    setConfirmDialog({
      isOpen: true,
      title: 'ซิงค์ข้อมูลการนัดหมาย B2B ลง Google Sheets',
      message: `ต้องการเขียนข้อมูลการนัดหมาย B2B ทั้งหมด (${appointments.length} รายการ) ลงในแผ่นงาน "การนัดหมาย B2B" ของ Google Sheets ใช่หรือไม่?`,
      confirmText: 'ซิงค์ข้อมูล',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await executeSyncB2B();
      },
    });
  };

  const executeSyncB2B = async () => {
    if (!config) return;
    const token = await getGoogleAccessToken();
    if (!token) {
      setStatusMessage({ type: 'error', text: 'กรุณาเข้าสู่ระบบ Google เพื่อซิงค์ข้อมูล' });
      return;
    }

    try {
      setIsSyncingB2B(true);
      const count = await syncAllAppointmentsToGoogleSheet(token, config.spreadsheetId, appointments);
      
      const updatedConfig = {
        ...config,
        lastSyncedAt: new Date().toLocaleString('th-TH'),
      };
      saveStoredSheetsConfig(updatedConfig);
      setConfig(updatedConfig);
      if (onConfigChange) onConfigChange(updatedConfig);

      setStatusMessage({
        type: 'success',
        text: `ซิงค์การนัดหมาย B2B จำนวน ${count} รายการลง Google Sheets สำเร็จ!`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการซิงค์การนัดหมาย B2B';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSyncingB2B(false);
    }
  };

  // Toggle Auto Sync options
  const handleToggleAutoSync = (field: 'autoSyncQuestions' | 'autoSyncB2B') => {
    if (!config) return;
    const updated = {
      ...config,
      [field]: !config[field],
    };
    saveStoredSheetsConfig(updated);
    setConfig(updated);
    if (onConfigChange) onConfigChange(updated);
  };

  // Disconnect Sheet
  const handleDisconnectSheet = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'ยกเลิกการเชื่อมต่อ Google Sheet',
      message: 'ต้องการยกเลิกการเชื่อมโยง Google Sheet นี้กับระบบบ้านโฮมหรือไม่? (ไฟล์ใน Google Drive จะยังคงอยู่ ไม่ถูกลบ)',
      confirmText: 'ยกเลิกเชื่อมต่อ',
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        saveStoredSheetsConfig(null);
        setConfig(null);
        if (onConfigChange) onConfigChange(null);
        setStatusMessage({ type: 'info', text: 'ยกเลิกการเชื่อมต่อ Google Sheets เรียบร้อยแล้ว' });
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#E5E0D5] animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto space-y-5">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E0D5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF5EC] text-[#1B3D2F] flex items-center justify-center shadow-xs border border-[#CDE5D2]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-[#1B3D2F] text-lg sm:text-xl">
                เชื่อมต่อฐานข้อมูล Google Sheets
              </h2>
              <p className="text-xs text-[#6F8274]">
                เก็บข้อมูลคำถามของพนักงาน และการนัดหมายลูกค้าองค์กร B2B แบบสองทาง
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

        {/* STEP 1: Google Account Connection */}
        <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-[#E5E0D5] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#1B3D2F] text-white text-[11px] font-bold flex items-center justify-center">
                1
              </span>
              <h3 className="font-bold text-sm text-[#1B3D2F]">
                การเข้าสู่ระบบ Google Workspace
              </h3>
            </div>
            {googleUser ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EBF7EE] text-[#1E6038] font-semibold border border-[#BDE5C8] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                เชื่อมต่อแล้ว
              </span>
            ) : (
              <span className="text-xs text-[#8A9C8F]">ต้องลงชื่อเข้าใช้</span>
            )}
          </div>

          {googleUser ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E8E4DA]">
              <div className="flex items-center gap-3">
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || 'Google User'}
                    className="w-10 h-10 rounded-full border border-[#D5D0C5]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#1B3D2F] text-white font-bold flex items-center justify-center text-sm">
                    {googleUser.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-bold text-xs text-[#1B3D2F]">
                    {googleUser.displayName || 'ผู้ใช้ Google'}
                  </div>
                  <div className="text-[11px] text-[#6F8274] font-mono">
                    {googleUser.email}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#8A2B3D] hover:bg-[#FDECEE] border border-transparent hover:border-[#F7BFC9] transition-all cursor-pointer self-start sm:self-center"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>เปลี่ยนบัญชี</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-[#5A6E60]">
                เชื่อมต่อบัญชี Google ของคุณเพื่ออนุญาตให้ระบบบ้านโฮมสร้างและบันทึกข้อมูลลง Google Sheets ใน Google Drive ของคุณโดยอัตโนมัติ
              </p>

              {/* Official GSI Styled Button */}
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="flex items-center justify-center gap-3 px-5 py-2.5 rounded-xl bg-white hover:bg-[#F8F6F0] text-[#3c4043] border border-[#dadce0] font-medium text-xs sm:text-sm shadow-xs transition-all cursor-pointer hover:shadow-sm active:scale-98 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>{isSigningIn ? 'กำลังเชื่อมต่อ Google...' : 'Sign in with Google'}</span>
              </button>
            </div>
          )}
        </div>

        {/* STEP 2: Database Sheet Setup */}
        <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-[#E5E0D5] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#1B3D2F] text-white text-[11px] font-bold flex items-center justify-center">
                2
              </span>
              <h3 className="font-bold text-sm text-[#1B3D2F]">
                การกำหนด Google Sheets ฐานข้อมูลกลาง (Shared Resort Database)
              </h3>
            </div>
            {config ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EBF7EE] text-[#1E6038] font-semibold border border-[#BDE5C8]">
                พร้อมใช้งาน
              </span>
            ) : (
              <span className="text-xs text-[#8A9C8F]">ยังไม่ได้เลือก Sheet</span>
            )}
          </div>

          {config ? (
            <div className="space-y-3">
              <div className="bg-white p-3.5 rounded-xl border border-[#E5E0D5] space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <FileSpreadsheet className="w-5 h-5 text-[#107C41] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-[#1B3D2F]">
                        {config.spreadsheetTitle}
                      </h4>
                      <p className="text-[11px] font-mono text-[#6F8274] truncate max-w-xs sm:max-w-md">
                        ID: {config.spreadsheetId}
                      </p>
                    </div>
                  </div>

                  <a
                    href={config.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#EAF5EC] hover:bg-[#D8ECDB] text-[#1B3D2F] text-xs font-bold transition-all shrink-0"
                  >
                    <span>เปิดใน Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="text-[11px] text-[#5A6E60] bg-[#FAF8F5] p-2 rounded-lg border border-[#EFECE6] flex flex-wrap items-center justify-between gap-2">
                  <span>
                    แผ่นงานภายใน: <strong>คำถามพนักงาน</strong> & <strong>การนัดหมาย B2B</strong>
                  </span>
                  {config.lastSyncedAt && (
                    <span className="text-[#889E90]">
                      ซิงค์ล่าสุด: {config.lastSyncedAt}
                    </span>
                  )}
                </div>
              </div>

              {/* Sync Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  onClick={handleTriggerSyncQuestions}
                  disabled={isSyncingQuestions || !googleUser}
                  className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#D5D0C5] text-left transition-all cursor-pointer shadow-2xs group disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#EBF3FC] text-[#1E4E8C] flex items-center justify-center shrink-0">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1B3D2F]">
                        ซิงค์คำถามพนักงาน
                      </div>
                      <div className="text-[11px] text-[#6F8274]">
                        {questionLogs.length} รายการในระบบ
                      </div>
                    </div>
                  </div>
                  <Download className={`w-4 h-4 text-[#1B3D2F] group-hover:translate-y-0.5 transition-transform ${isSyncingQuestions ? 'animate-bounce' : ''}`} />
                </button>

                <button
                  onClick={handleTriggerSyncB2B}
                  disabled={isSyncingB2B || !googleUser}
                  className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#D5D0C5] text-left transition-all cursor-pointer shadow-2xs group disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#FEF6E8] text-[#9A5B08] flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1B3D2F]">
                        ซิงค์การนัดหมาย B2B
                      </div>
                      <div className="text-[11px] text-[#6F8274]">
                        {appointments.length} นัดหมายในระบบ
                      </div>
                    </div>
                  </div>
                  <Download className={`w-4 h-4 text-[#1B3D2F] group-hover:translate-y-0.5 transition-transform ${isSyncingB2B ? 'animate-bounce' : ''}`} />
                </button>
              </div>

              {/* Automation Toggles */}
              <div className="bg-white p-3 rounded-xl border border-[#E8E4DA] space-y-2">
                <div className="text-xs font-bold text-[#1B3D2F] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#1B3D2F]" />
                  <span>การบันทึกอัตโนมัติ (Real-time Auto-Append)</span>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center justify-between text-xs text-[#3E5244] cursor-pointer">
                    <span>บันทึกอัตโนมัติเมื่อพนักงานถามคำถามน้องโฮม</span>
                    <input
                      type="checkbox"
                      checked={config.autoSyncQuestions}
                      onChange={() => handleToggleAutoSync('autoSyncQuestions')}
                      className="rounded text-[#1B3D2F] focus:ring-[#1B3D2F] w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-[#3E5244] cursor-pointer">
                    <span>บันทึกอัตโนมัติเมื่อมีการเพิ่ม/แก้ไขนัดหมาย B2B</span>
                    <input
                      type="checkbox"
                      checked={config.autoSyncB2B}
                      onChange={() => handleToggleAutoSync('autoSyncB2B')}
                      className="rounded text-[#1B3D2F] focus:ring-[#1B3D2F] w-4 h-4"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleDisconnectSheet}
                  className="text-xs text-[#B8324E] hover:underline cursor-pointer"
                >
                  ยกเลิกการเชื่อมต่อ Sheet นี้
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[#5A6E60]">
                คุณสามารถให้ระบบสร้าง Google Sheets ฐานข้อมูลอัตโนมัติ หรือระบุ Sheet ID ที่มีอยู่แล้วได้:
              </p>

              {/* Option A: One-Click Auto-Create */}
              <button
                onClick={handleTriggerCreate}
                disabled={isCreatingSheet || !googleUser}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1B3D2F] hover:bg-[#244E3C] text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-[#F5DEAB]" />
                <span>
                  {isCreatingSheet
                    ? 'กำลังสร้าง Google Sheets อัตโนมัติ...'
                    : 'สร้าง Google Sheets ฐานข้อมูลอัตโนมัติ (แนะนำ)'}
                </span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#E0DBD0]"></div>
                <span className="flex-shrink mx-3 text-[11px] text-[#8C9E90]">หรือ</span>
                <div className="flex-grow border-t border-[#E0DBD0]"></div>
              </div>

              {/* Option B: Connect Existing Sheet */}
              {isManualInputMode ? (
                <div className="space-y-2 bg-white p-3 rounded-xl border border-[#E5E0D5]">
                  <label className="block text-xs font-bold text-[#2C3E33]">
                    ระบุ Google Spreadsheet ID หรือ URL
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms หรือ URL"
                    value={manualSheetInput}
                    onChange={(e) => setManualSheetInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D5D0C5] focus:outline-none focus:border-[#1B3D2F] font-mono"
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setIsManualInputMode(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-[#5A6E60] hover:bg-[#FAF8F5]"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleConnectExistingSheet}
                      disabled={isVerifyingManual}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-[#1B3D2F] hover:bg-[#244E3C] disabled:opacity-50"
                    >
                      {isVerifyingManual ? 'กำลังตรวจสอบ...' : 'ยืนยันการเชื่อมต่อ'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsManualInputMode(true)}
                  className="w-full py-2 px-3 rounded-xl border border-[#D5D0C5] text-xs font-semibold text-[#5A6E60] hover:bg-white transition-all cursor-pointer"
                >
                  เชื่อมต่อกับ Google Sheet ที่มีอยู่แล้ว (ระบุ ID)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#E5E0D5]">
          <div className="flex items-center gap-1.5 text-xs text-[#6F8274]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2E7246]" />
            <span>เข้าถึงเฉพาะไฟล์ Google Sheets ที่ได้รับอนุญาตเท่านั้น</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#1B3D2F] bg-[#FAF8F5] hover:bg-[#F2EFE8] border border-[#D5D0C5] cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* In-App Confirmation Dialog for Destructive / Mutating Operations */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#E5E0D5] animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EAF5EC] text-[#1B3D2F] flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
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
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#1B3D2F] hover:bg-[#244E3C] shadow-xs cursor-pointer"
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
