import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Link,
  ClipboardPaste,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Table,
  Eye,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { KnowledgeItem, StaffProfile, UserRole } from '../types';
import { getActiveSessionUser } from '../utils/authService';
import { canUserManageSystem } from '../utils/b2bService';
import {
  fetchGoogleSheet,
  parseTSV,
  convertRowsToKnowledgeItems,
  generateTemplateCSV,
  saveSyncedKnowledgeItems,
  clearSyncedKnowledgeItems,
  getSyncedSheetUrl,
  getSyncedLastTime,
} from '../utils/googleSheetsSync';
import { KNOWLEDGE_BASE_ITEMS } from '../data/knowledgeBase';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentActiveItems: KnowledgeItem[];
  onApplySyncedItems: (items: KnowledgeItem[], isFromSheet: boolean) => void;
  isUsingCustomSheet: boolean;
  currentUser?: StaffProfile | null;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  currentActiveItems,
  onApplySyncedItems,
  isUsingCustomSheet,
  currentUser,
}) => {
  const activeUser = currentUser || getActiveSessionUser();
  const currentRole: UserRole = activeUser?.role || 'Knowledge User';
  const isAdmin = canUserManageSystem(currentRole);

  const [activeTab, setActiveTab] = useState<'link' | 'paste' | 'template'>('link');
  const [sheetUrl, setSheetUrl] = useState(getSyncedSheetUrl() || '');
  const [pastedText, setPastedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewItems, setPreviewItems] = useState<KnowledgeItem[] | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(getSyncedLastTime());

  if (!isOpen) return null;

  // Handle Sync by URL
  const handleSyncByUrl = async () => {
    if (!isAdmin) {
      setStatusMessage({ type: 'error', text: 'สิทธิ์ไม่เพียงพอ: เฉพาะ Administrator เท่านั้นที่สามารถเปลี่ยนลิงก์ฐานความรู้ได้' });
      return;
    }
    if (!sheetUrl.trim()) {
      setStatusMessage({ type: 'error', text: 'กรุณากรอกลิงก์ Google Sheets ก่อนกดซิงค์' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const items = await fetchGoogleSheet(sheetUrl);
      setPreviewItems(items);
      setStatusMessage({
        type: 'success',
        text: `ดึงข้อมูลสำเร็จ! พบทั้งหมด ${items.length} รายการ ตรวจสอบข้อมูลด้านล่างแล้วกด "บันทึกใช้งาน"`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาตรวจสอบลิงก์และสิทธิ์การเข้าถึง',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Import by Pasting TSV Table
  const handleImportPastedText = () => {
    if (!pastedText.trim()) {
      setStatusMessage({ type: 'error', text: 'กรุณาวางข้อมูลจากตาราง Google Sheets ลงในกล่องข้อความ' });
      return;
    }

    try {
      const rows = parseTSV(pastedText);
      const items = convertRowsToKnowledgeItems(rows);
      if (items.length === 0) {
        throw new Error('ไม่พบข้อมูลที่ถูกต้อง กรุณาคัดลอกตารางจาก Google Sheets โดยมีหัวข้อคอลัมน์ให้ครบ');
      }

      setPreviewItems(items);
      setStatusMessage({
        type: 'success',
        text: `แปลงข้อมูลสำเร็จ ${items.length} รายการ ตรวจสอบพรีวิวด้านล่างแล้วกด "บันทึกใช้งาน"`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'แปลงข้อมูลไม่สำเร็จ กรุณาตรวจสอบการคัดลอก',
      });
    }
  };

  // Apply preview items as active knowledge base
  const handleConfirmApply = () => {
    if (!isAdmin) {
      setStatusMessage({ type: 'error', text: 'สิทธิ์ไม่เพียงพอ: เฉพาะ Administrator เท่านั้นที่สามารถบันทึกข้อมูลทับฐานข้อมูลกลางได้' });
      return;
    }
    if (!previewItems || previewItems.length === 0) return;
    saveSyncedKnowledgeItems(previewItems, sheetUrl);
    onApplySyncedItems(previewItems, true);
    setLastSyncTime(new Date().toISOString());
    setStatusMessage({
      type: 'success',
      text: 'บันทึกข้อมูลและนำไปใช้ในระบบเรียบร้อยแล้ว น้องโฮมจะใช้ข้อมูลจากตารางนี้ตอบคำถามทันที ✨',
    });
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  // Reset to default Baan Home knowledge base
  const handleResetToDefault = () => {
    if (!isAdmin) {
      setStatusMessage({ type: 'error', text: 'สิทธิ์ไม่เพียงพอ: เฉพาะ Administrator เท่านั้นที่สามารถรีเซ็ตฐานข้อมูลได้' });
      return;
    }
    clearSyncedKnowledgeItems();
    onApplySyncedItems(KNOWLEDGE_BASE_ITEMS, false);
    setPreviewItems(null);
    setSheetUrl('');
    setLastSyncTime(null);
    setStatusMessage({
      type: 'success',
      text: 'รีเซ็ตกลับไปใช้ฐานข้อมูลมาตรฐานของบ้านโฮมเรียบร้อยแล้ว',
    });
  };

  // Download template CSV
  const handleDownloadTemplate = () => {
    const csvData = generateTemplateCSV();
    const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'BaanHome_Knowledge_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#FAF8F3] rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#D8E6D5] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-[#E5EDE3] bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F4E6] text-[#1E7238] flex items-center justify-center shrink-0 border border-[#CDE5CA]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#143322] font-heading">
                  เชื่อมต่อฐานข้อมูล Google Sheets
                </h3>
                {isUsingCustomSheet ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E5F5E4] text-[#1D7438] border border-[#C6E8C3]">
                    ⚡ กำลังใช้ข้อมูลจาก Sheets
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F3EFE3] text-[#786438] border border-[#E5DFCA]">
                    ค่าเริ่มต้น (Baan Home Default)
                  </span>
                )}
              </div>
              <p className="text-xs text-[#526B5C] mt-0.5">
                แก้ไขข้อมูลในตาราง Google Sheets เพื่อให้อัปเดตคำตอบของน้องโฮมได้ทันทีโดยไม่ต้องแก้โค้ด
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#728779] hover:text-[#183626] hover:bg-[#F2ECE0] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-5 sm:px-7 pt-3 bg-white border-b border-[#EBE6D8] flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'link'
                ? 'border-[#2D5A43] text-[#1D402F]'
                : 'border-transparent text-[#6D8374] hover:text-[#1D402F]'
            }`}
          >
            <Link className="w-4 h-4" />
            <span>1. วางลิงก์ Google Sheets (แนะนำ)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'paste'
                ? 'border-[#2D5A43] text-[#1D402F]'
                : 'border-transparent text-[#6D8374] hover:text-[#1D402F]'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>2. ก๊อปปี้ตารางมาวางตรงๆ (เร็วที่สุด)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'template'
                ? 'border-[#2D5A43] text-[#1D402F]'
                : 'border-transparent text-[#6D8374] hover:text-[#1D402F]'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>3. ดาวน์โหลดตารางตัวอย่าง</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-5 text-xs sm:text-sm">
          
          {/* Status Message Alert */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl flex items-start gap-2.5 animate-in fade-in text-xs sm:text-sm ${
                statusMessage.type === 'success'
                  ? 'bg-[#EBF7EA] text-[#1D6335] border border-[#CCE8C8]'
                  : 'bg-[#FDF1F0] text-[#9A2626] border border-[#F6D0D0]'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">{statusMessage.text}</div>
            </div>
          )}

          {/* TAB 1: By URL */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-[#DDE7DA] shadow-2xs">
                <h4 className="text-xs font-bold text-[#1F3D2C] uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#1F3D2C] text-white flex items-center justify-center text-[10px]">1</span>
                  <span>ตั้งค่าสิทธิ์แชร์ใน Google Sheets ของท่าน:</span>
                </h4>
                <p className="text-xs text-[#526B5C] leading-relaxed pl-7">
                  เปิดไฟล์ Google Sheets &gt; กดปุ่ม <strong>แชร์ (Share)</strong> มุมขวาบน &gt; ตรงการเข้าถึงทั่วไป เปลี่ยนเป็น <strong>"ทุกคนที่มีลิงก์มีสิทธิ์ดู" (Anyone with the link can view)</strong> &gt; แล้วคัดลอกลิงก์มาวาง
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F3D2C] mb-1.5">
                  วางลิงก์ Google Sheets ที่นี่:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1a2b3c4d5e.../edit"
                      className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-[#CCD8C8] bg-white text-[#1D3628] focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncByUrl}
                    disabled={isLoading}
                    className="px-5 py-2.5 bg-[#2D5A43] hover:bg-[#1E3E2F] disabled:bg-[#8AA294] text-white font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 text-xs sm:text-sm shrink-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{isLoading ? 'กำลังดึงข้อมูล...' : '🔄 ดึงข้อมูลทันที'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#7A9182] mt-1.5 pl-1">
                  รองรับทุกลิงก์ Google Sheets มาตรฐาน ไม่จำเป็นต้องใช้ API Key
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Direct Paste TSV */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-[#DDE7DA] shadow-2xs">
                <h4 className="text-xs font-bold text-[#1F3D2C] uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#1F3D2C] text-white flex items-center justify-center text-[10px]">⚡</span>
                  <span>วิธีวางข้อมูลแบบรวดเร็ว (ไม่ต้องเปิดสิทธิ์แชร์):</span>
                </h4>
                <p className="text-xs text-[#526B5C] leading-relaxed pl-7">
                  1. เปิดตารางใน Google Sheets <br />
                  2. ลากคลุมข้อมูลทั้งหมดที่ต้องการ หรือกด <strong>Ctrl + A</strong> (เลือกทั้งหมด) แล้วกด <strong>Ctrl + C</strong> (คัดลอก) <br />
                  3. นำมากด <strong>Ctrl + V</strong> วางลงในช่องด้านล่าง แล้วกดปุ่ม <strong>"นำเข้าข้อมูล"</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F3D2C] mb-1.5">
                  วางข้อความจาก Google Sheets ที่นี่:
                </label>
                <textarea
                  rows={5}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="วางตารางที่คัดลอกมาจาก Google Sheets (รวมหัวแถว เช่น หมวดหมู่, หัวข้อ, คำสำคัญ, ข้อความส่งลูกค้า...)"
                  className="w-full text-xs font-mono p-3 rounded-xl border border-[#CCD8C8] bg-white text-[#1D3628] focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                />
                <button
                  type="button"
                  onClick={handleImportPastedText}
                  className="mt-2 px-5 py-2.5 bg-[#2D5A43] hover:bg-[#1E3E2F] text-white font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-2 text-xs sm:text-sm"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>นำเข้าข้อมูลจากข้อความที่วาง</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Template Download & Columns Explanation */}
          {activeTab === 'template' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-[#DDE7DA] shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#F0F5EE]">
                  <div>
                    <h4 className="text-sm font-bold text-[#143322]">
                      ตารางต้นแบบสำหรับบ้านโฮม (Template Sheet)
                    </h4>
                    <p className="text-xs text-[#526B5C] mt-0.5">
                      ดาวน์โหลดไฟล์นี้ไปอัปโหลดเข้า Google Drive เพื่อเปิดใช้และพิมพ์แก้ไขได้ทันที
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E8F4E6] hover:bg-[#DCEDDA] text-[#1D7438] font-bold text-xs border border-[#CDE5CA] transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลด BaanHome_Template.csv</span>
                  </button>
                </div>

                <h5 className="text-xs font-bold text-[#1F3D2C] uppercase tracking-wider mb-2.5">
                  โครงสร้าง 8 คอลัมน์มาตรฐาน:
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#FAFBF9] p-2.5 rounded-xl border border-[#E9F0E7]">
                    <span className="font-bold text-[#2D5A43]">A: หมวดหมู่</span>
                    <span className="text-[#557061] block text-[11px]">เช่น reservation, restaurant, pool-villa</span>
                  </div>
                  <div className="bg-[#FAFBF9] p-2.5 rounded-xl border border-[#E9F0E7]">
                    <span className="font-bold text-[#2D5A43]">B: หัวข้อ / คำถาม</span>
                    <span className="text-[#557061] block text-[11px]">เช่น ข้อมูลบัญชีธนาคารสำหรับโอนเงิน</span>
                  </div>
                  <div className="bg-[#FAFBF9] p-2.5 rounded-xl border border-[#E9F0E7]">
                    <span className="font-bold text-[#2D5A43]">C: คำสำคัญ (Keywords)</span>
                    <span className="text-[#557061] block text-[11px]">คำค้นหา คั่นด้วยจุลภาค เช่น เลขบัญชี, โอนเงิน</span>
                  </div>
                  <div className="bg-[#FAFBF9] p-2.5 rounded-xl border border-[#E9F0E7]">
                    <span className="font-bold text-[#2D5A43]">D: 💬 ข้อความพร้อมส่งลูกค้า</span>
                    <span className="text-[#557061] block text-[11px]">ข้อความสุภาพ มีเว้นบรรทัดและอีโมจิ</span>
                  </div>
                  <div className="bg-[#FAFBF9] p-2.5 rounded-xl border border-[#E9F0E7]">
                    <span className="font-bold text-[#2D5A43]">E: ✨ คำตอบสรุป</span>
                    <span className="text-[#557061] block text-[11px]">สรุปสั้น 1-2 ประโยคสำหรับพนักงาน</span>
                  </div>
                  <div className="bg-[#FAFBF9] p-2.5 rounded-xl border border-[#E9F0E7]">
                    <span className="font-bold text-[#2D5A43]">F: 📋 รายละเอียดในระบบ</span>
                    <span className="text-[#557061] block text-[11px]">กฎระเบียบ คั่นข้อด้วยเครื่องหมาย | หรือขึ้นบรรทัด</span>
                  </div>
                  <div className="bg-[#FAFBF9] p-2.5 rounded-xl border border-[#E9F0E7]">
                    <span className="font-bold text-[#2D5A43]">G: ✅ สิ่งที่ต้องทำต่อ (SOP)</span>
                    <span className="text-[#557061] block text-[11px]">ขั้นตอนประสานงาน คั่นข้อด้วยเครื่องหมาย |</span>
                  </div>
                  <div className="bg-[#FAFBF9] p-2.5 rounded-xl border border-[#E9F0E7]">
                    <span className="font-bold text-[#2D5A43]">H: เอกสารอ้างอิง</span>
                    <span className="text-[#557061] block text-[11px]">ชื่อไฟล์ Docs ต้นทาง</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PREVIEW OF SYNCED ROWS (Shown when previewItems exist) */}
          {previewItems && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#C9DEC6] shadow-sm animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-[#F0F5EE]">
                <div className="flex items-center gap-2">
                  <Table className="w-5 h-5 text-[#2D5A43]" />
                  <span className="font-bold text-sm sm:text-base text-[#143322]">
                    ตัวอย่างข้อมูลที่ดึงได้ ({previewItems.length} หัวข้อ)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmApply}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#238636] hover:bg-[#1E722E] text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>✅ ยืนยันบันทึกและเริ่มใช้งาน</span>
                </button>
              </div>

              {/* Table Preview */}
              <div className="max-h-60 overflow-y-auto border border-[#E5EDE3] rounded-xl text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#F6FAF4] text-[#294B37] font-semibold sticky top-0 border-b border-[#E5EDE3]">
                    <tr>
                      <th className="p-2.5">หมวด</th>
                      <th className="p-2.5">หัวข้อ</th>
                      <th className="p-2.5">ตัวอย่างข้อความส่งลูกค้า</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F5EE]">
                    {previewItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#FAFDF9]">
                        <td className="p-2.5 align-top font-medium text-[#2C6242] whitespace-nowrap">
                          {item.category}
                        </td>
                        <td className="p-2.5 align-top font-semibold text-[#183626] min-w-[180px]">
                          {item.title}
                        </td>
                        <td className="p-2.5 align-top text-[#4E6758] truncate max-w-xs">
                          {item.customerMessage}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Active Database Summary */}
          <div className="bg-[#F8F6EF] rounded-2xl p-4 border border-[#E8E2D1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#526B5C]">
            <div>
              <div className="font-bold text-[#2A4233] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#916B2D]" />
                <span>สถานะฐานข้อมูลปัจจุบัน:</span>
                <strong className="text-[#1A3827]">
                  {isUsingCustomSheet ? 'ใช้งานข้อมูลจาก Google Sheets ของท่าน' : 'ใช้งานฐานข้อมูลมาตรฐานบ้านโฮม'}
                </strong>
                <span>({currentActiveItems.length} รายการ)</span>
              </div>
              {lastSyncTime && (
                <div className="text-[11px] text-[#789182] mt-0.5">
                  ซิงค์ล่าสุด: {new Date(lastSyncTime).toLocaleString('th-TH')}
                </div>
              )}
            </div>

            {isUsingCustomSheet && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FDF3E7] text-[#9A3412] border border-[#ECDCCB] font-semibold transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>รีเซ็ตกลับไปใช้ค่าเดิม</span>
              </button>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-7 py-3.5 bg-white border-t border-[#E5EDE3] flex items-center justify-between">
          <span className="text-[11px] text-[#697E72]">
            เมื่อบันทึกแล้ว ข้อมูลจะถูกเก็บไว้ในบราวเซอร์ของท่าน ไม่สูญหายเมื่อรีเฟรชหน้า
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#486353] hover:bg-[#F2ECE0] transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
