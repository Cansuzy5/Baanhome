import React, { useEffect, useState } from 'react';
import { X, Database, RefreshCw } from 'lucide-react';
import { QuestionLog, B2BAppointment } from '../types';
import { GoogleSheetsDbConfig } from '../utils/googleSheetsDatabase';
import { sharedApi } from '../utils/sharedApi';
import { getActiveSessionUser } from '../utils/authService';
interface Props { isOpen: boolean; onClose: () => void; questionLogs: QuestionLog[]; appointments: B2BAppointment[]; onConfigChange?: (config: GoogleSheetsDbConfig | null) => void; }
export const GoogleSheetsDbConnectModal: React.FC<Props> = ({ isOpen, onClose, onConfigChange }) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [migration, setMigration] = useState<any>(null);
  const migrate = async (preview: boolean) => {
    setLoading(true); setError('');
    try {
      let result;
      do {
        result = await sharedApi('/api/sync/sheets-config', { action: preview ? 'preview-import' : 'import-legacy' });
        setMigration(result.migration);
      } while (!preview && result.migration.remaining > 0);
      if (!preview) await check();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  const check = async () => {
    setLoading(true); setError(''); setData(null);
    try { const result = await sharedApi('/api/sync/sheets-config'); setData(result); onConfigChange?.(result.config); }
    catch (e: any) { setError(e.message); onConfigChange?.(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (isOpen) void check(); }, [isOpen]);
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-label="ฐานข้อมูลกลาง" className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-xl">
    <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-[#1B4032] flex gap-2"><Database /> ฐานข้อมูลกลาง Google Sheets</h2><button aria-label="ปิด" onClick={onClose}><X /></button></div>
    <p className="mt-4">บ้านโฮม - ฐานข้อมูลคำถามพนักงาน & นัดหมาย B2B</p>
    <p className="text-sm text-gray-600 mt-2">ทุกคนใช้ชีทเดียวกันสำหรับคำถามและนัดหมาย โดยเข้าสู่ระบบด้วยบัญชีพนักงานตามปกติ</p>
    {loading && <p className="mt-4">กำลังตรวจสอบการเชื่อมต่อจริง…</p>}
    {error && <p role="alert" className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl">{error}</p>}
    {data && <div className="mt-4 p-4 bg-green-50 rounded-xl"><p>เชื่อมต่อฐานกลางสำเร็จ</p><p>คำถาม {data.questions} รายการ · นัดหมาย {data.appointments} รายการ</p><p className="text-xs mt-2">ตรวจล่าสุด {new Date(data.config.lastSyncedAt).toLocaleString('th-TH')}</p><a className="underline block mt-3" href={data.config.spreadsheetUrl} target="_blank" rel="noreferrer">เปิด Google Sheets</a></div>}
    <p className="text-sm text-gray-600 mt-4">ฐานความรู้ยังนำเข้าจากไฟล์ผ่านเมนูเดิม</p>
    {data && getActiveSessionUser()?.role === 'Administrator' && <div className="mt-4 border-t pt-3 text-sm">
      <button disabled={loading} className="underline" onClick={() => void migrate(true)}>ตรวจข้อมูลเดิมที่ยังไม่ได้ย้ายจากฐานกลาง</button>
      {migration && <p className="mt-2">{migration.alreadyImported ? 'นำเข้าข้อมูลเดิมแล้ว' : `พบคำถาม ${migration.questions} รายการ และนัดหมาย ${migration.appointments} รายการที่ยังไม่มีในชีท`}</p>}
      {migration && !migration.alreadyImported && (migration.questions + migration.appointments > 0) && <button disabled={loading} className="mt-2 border rounded-lg p-2" onClick={() => void migrate(false)}>ยืนยันนำเข้าเฉพาะรายการที่ยังไม่มี</button>}
    </div>}
    <button disabled={loading} onClick={() => void check()} className="mt-5 px-4 py-2 rounded-xl bg-[#1B4032] text-white flex gap-2 disabled:opacity-50"><RefreshCw size={18} /> ตรวจสอบอีกครั้ง</button>
  </div></div>;
};
