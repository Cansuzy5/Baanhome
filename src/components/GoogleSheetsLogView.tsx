import React, { useState } from 'react';
import {
  Sheet,
  Download,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
  Trash2,
  Database,
  Link,
} from 'lucide-react';
import { QuestionLog } from '../types';
import { GoogleSheetsDbConfig } from '../utils/googleSheetsDatabase';

interface GoogleSheetsLogViewProps {
  logs: QuestionLog[];
  onSelectLog: (log: QuestionLog) => void;
  onClearLogs?: () => void;
  onDeleteLog?: (id: string) => void;
  onOpenSheetsSync?: () => void;
  isUsingCustomSheet?: boolean;
  onOpenGoogleSheetsDbModal?: () => void;
  sheetsDbConfig?: GoogleSheetsDbConfig | null;
}

export const GoogleSheetsLogView: React.FC<GoogleSheetsLogViewProps> = ({
  logs,
  onSelectLog,
  onClearLogs,
  onDeleteLog,
  onOpenSheetsSync,
  isUsingCustomSheet = false,
  onOpenGoogleSheetsDbModal,
  sheetsDbConfig,
}) => {
  const [filterText, setFilterText] = useState('');
  const [filterFound, setFilterFound] = useState<'all' | 'found' | 'not-found'>('all');
  const [isExporting, setIsExporting] = useState(false);

  const filteredLogs = logs.filter((log) => {
    const matchesText =
      log.question.toLowerCase().includes(filterText.toLowerCase()) ||
      log.staffName.toLowerCase().includes(filterText.toLowerCase()) ||
      log.department.toLowerCase().includes(filterText.toLowerCase()) ||
      log.category.toLowerCase().includes(filterText.toLowerCase());

    if (!matchesText) return false;

    if (filterFound === 'found') return log.found;
    if (filterFound === 'not-found') return !log.found;

    return true;
  });

  const exportCSV = () => {
    setIsExporting(true);
    const headers = [
      'วันที่เวลา',
      'ผู้ถาม',
      'แผนก',
      'คำถาม',
      'คำตอบ',
      'หมวด',
      'แหล่งข้อมูล',
      'พบคำตอบหรือไม่',
      'Feedback',
    ];

    const rows = logs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.staffName}"`,
      `"${l.department}"`,
      `"${l.question.replace(/"/g, '""')}"`,
      `"${l.answerSummary.replace(/"/g, '""')}"`,
      `"${l.category}"`,
      `"${l.sourceDoc}"`,
      `"${l.found ? 'พบคำตอบ' : 'ไม่พบคำตอบ'}"`,
      `"${l.feedback || '-'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BaanHome_Inquiries_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setIsExporting(false), 1000);
  };

  const totalLogs = logs.length;
  const foundCount = logs.filter((l) => l.found).length;
  const accurateFeedbackCount = logs.filter((l) => l.feedback === 'accurate').length;

  return (
    <div className="space-y-6">
      {/* Google Sheets Live Database Management Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E3DDD0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#EAF7ED] text-[#107C41] flex items-center justify-center shrink-0 border border-[#BDE5C8] shadow-2xs">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base sm:text-lg text-[#1B3D2F]">
                Google Sheets ฐานข้อมูลคำถาม & นัดหมาย B2B
              </h3>
              {sheetsDbConfig ? (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#EBF7EE] text-[#1E6038] font-bold border border-[#BDE5C8] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  เชื่อมต่อแล้ว
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FAF0DC] text-[#8C5E1B] font-medium border border-[#EED7B0]">
                  รอการเชื่อมต่อ
                </span>
              )}
            </div>

            {sheetsDbConfig ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#5D7062]">
                <span>ไฟล์: <strong className="text-[#1B3D2F]">{sheetsDbConfig.spreadsheetTitle}</strong></span>
                <span>•</span>
                <span>แผ่นงาน: <strong>คำถามพนักงาน</strong> & <strong>การนัดหมาย B2B</strong></span>
                {sheetsDbConfig.lastSyncedAt && (
                  <>
                    <span>•</span>
                    <span className="text-[#8B9E90]">ซิงค์ล่าสุด: {sheetsDbConfig.lastSyncedAt}</span>
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#6F8274] mt-0.5">
                เชื่อมต่อ Google Sheets ใน Drive เพื่อบันทึกคำถามพนักงานและการนัดหมาย B2B อัตโนมัติแบบเรียลไทม์
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
          {sheetsDbConfig && (
            <a
              href={sheetsDbConfig.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EAF7ED] hover:bg-[#DCF2E2] text-[#107C41] text-xs font-bold transition-all border border-[#BDE5C8] shadow-2xs"
            >
              <span>เปิดดูใน Google Sheets</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {onOpenGoogleSheetsDbModal && (
            <button
              onClick={onOpenGoogleSheetsDbModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1B3D2F] hover:bg-[#244E3C] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-[#E8C57D]" />
              <span>{sheetsDbConfig ? 'จัดการการเชื่อมต่อ & ซิงค์' : 'เชื่อมต่อ / สร้าง Google Sheets'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sheets Integration Banner */}
      <div className="bg-gradient-to-r from-[#107C41] to-[#0D6535] text-white p-5 rounded-2xl shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white text-[#107C41] rounded-xl shadow-xs">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold">
                  ประวัติการค้นหาทั้งหมด (Search Logs)
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">
                  Live Synced
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                เก็บข้อมูลเพื่อนำไปวิเคราะห์และปรับปรุงฐานความรู้ รองรับการส่งออกไฟล์เป็น Excel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            {onClearLogs && logs.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm(`ต้องการล้างประวัติการค้นหาทั้งหมด (${logs.length} รายการ) ใช่หรือไม่?`)) {
                    onClearLogs();
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer border border-white/20"
                title="ลบประวัติการค้นหาทั้งหมด"
              >
                <Trash2 className="w-4 h-4" />
                <span>ล้างประวัติ</span>
              </button>
            )}
            {onOpenSheetsSync && (
              <button
                onClick={onOpenSheetsSync}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E8C57D] hover:bg-[#DDB86C] text-[#1A3D2D] text-xs font-bold shadow-sm transition-all cursor-pointer border border-[#E8C57D]"
                title="นำเข้าฐานความรู้จาก Google Sheets หรือ CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#1A3D2D]" />
                <span>นำเข้าฐานความรู้</span>
                {isUsingCustomSheet && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#107C41] text-white">
                    ซิงค์แล้ว
                  </span>
                )}
              </button>
            )}
            <button
              onClick={exportCSV}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-[#107C41] hover:bg-[#F2FBF5] text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'กำลังส่งออก...' : 'ส่งออก CSV'}</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/20 text-xs">
          <div className="bg-white/10 p-2.5 rounded-lg backdrop-blur-xs">
            <div className="text-white/70">คำถามทั้งหมดที่บันทึก</div>
            <div className="text-xl font-bold mt-0.5">{totalLogs} รายการ</div>
          </div>
          <div className="bg-white/10 p-2.5 rounded-lg backdrop-blur-xs">
            <div className="text-white/70">อัตราพบคำตอบใน Docs</div>
            <div className="text-xl font-bold mt-0.5">
              {totalLogs > 0 ? Math.round((foundCount / totalLogs) * 100) : 0}%
            </div>
          </div>
          <div className="bg-white/10 p-2.5 rounded-lg backdrop-blur-xs">
            <div className="text-white/70">คำถามรออัปเดต Docs</div>
            <div className="text-xl font-bold mt-0.5">{totalLogs - foundCount} รายการ</div>
          </div>
          <div className="bg-white/10 p-2.5 rounded-lg backdrop-blur-xs">
            <div className="text-white/70">ประเมินถูกต้องสมบูรณ์</div>
            <div className="text-xl font-bold mt-0.5">{accurateFeedbackCount} ครั้ง</div>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-[#FAF8F3] p-4 rounded-xl border border-[#E3DDD0] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8C9E92] absolute left-3 top-2.5" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="ค้นหาในตาราง Sheets..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#D3DDD1] bg-white focus:outline-none focus:ring-2 focus:ring-[#107C41]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-[#6D8073]">สถานะ:</span>
          <div className="inline-flex rounded-lg border border-[#D3DDD1] bg-white p-0.5 text-xs">
            <button
              onClick={() => setFilterFound('all')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterFound === 'all' ? 'bg-[#107C41] text-white font-medium' : 'text-[#506356]'
              }`}
            >
              ทั้งหมด ({logs.length})
            </button>
            <button
              onClick={() => setFilterFound('found')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterFound === 'found' ? 'bg-[#107C41] text-white font-medium' : 'text-[#506356]'
              }`}
            >
              พบคำตอบ ({foundCount})
            </button>
            <button
              onClick={() => setFilterFound('not-found')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterFound === 'not-found' ? 'bg-[#107C41] text-white font-medium' : 'text-[#506356]'
              }`}
            >
              ไม่พบ ({totalLogs - foundCount})
            </button>
          </div>
        </div>
      </div>

      {/* 9 Columns Table Structure */}
      <div className="bg-[#FAF8F3] rounded-2xl border border-[#D5DDD2] shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-[#EEF5EC] border-b border-[#D5DDD2] flex items-center justify-between text-xs text-[#294B37]">
          <div className="font-semibold flex items-center gap-2">
            <span>ตารางข้อมูล 9 คอลัมน์ที่ถูกจัดเก็บลง Google Sheets</span>
          </div>
          <span className="font-mono text-[#5B7363]">
            แสดง {filteredLogs.length} จาก {logs.length} แถว
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#22362A] border-collapse">
            <thead>
              <tr className="bg-[#E2ECE0] text-[#1E3E2E] border-b border-[#CCD9CA] font-semibold tracking-wider uppercase text-[11px]">
                <th className="p-3 whitespace-nowrap">#</th>
                <th className="p-3 whitespace-nowrap">1. วันที่เวลา</th>
                <th className="p-3 whitespace-nowrap">2. ผู้ถาม</th>
                <th className="p-3 whitespace-nowrap">3. แผนก</th>
                <th className="p-3 min-w-[220px]">4. คำถาม</th>
                <th className="p-3 min-w-[260px]">5. คำตอบ</th>
                <th className="p-3 whitespace-nowrap">6. หมวด</th>
                <th className="p-3 whitespace-nowrap">7. แหล่งข้อมูล</th>
                <th className="p-3 whitespace-nowrap">8. พบคำตอบหรือไม่</th>
                <th className="p-3 whitespace-nowrap">9. Feedback</th>
                <th className="p-3 whitespace-nowrap text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7ECE4] bg-white">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-[#829688]">
                    ไม่พบข้อมูลที่ตรงกับตัวกรอง
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => (
                  <tr
                    key={log.id}
                    onClick={() => onSelectLog(log)}
                    className="hover:bg-[#F6FAF4] transition-colors cursor-pointer"
                  >
                    <td className="p-3 text-center font-mono text-[#7D9183] bg-[#FAF8F3]">
                      {index + 1}
                    </td>
                    <td className="p-3 whitespace-nowrap font-mono text-[#4F6355]">
                      {log.timestamp}
                    </td>
                    <td className="p-3 whitespace-nowrap font-medium text-[#1E3B2C]">
                      {log.staffName}
                    </td>
                    <td className="p-3 whitespace-nowrap text-[#495E50]">
                      {log.department}
                    </td>
                    <td className="p-3 font-semibold text-[#182F22]">
                      {log.question}
                    </td>
                    <td className="p-3 text-[#3D5244] line-clamp-2">
                      {log.answerSummary}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-[#EDF4EB] text-[#29573D] text-[11px]">
                        {log.category}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap font-mono text-[11px] text-[#55695C]">
                      {log.sourceDoc}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {log.found ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#E4F4E4] text-[#1D7736]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>พบคำตอบ</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEECEB] text-[#B91C1C]">
                          <XCircle className="w-3 h-3" />
                          <span>ไม่พบคำตอบ</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {log.feedback === 'accurate' && (
                        <span className="px-2 py-0.5 rounded-md bg-[#E8F5E9] text-[#2E7D32] font-medium text-[11px]">
                          👍 ถูกต้อง
                        </span>
                      )}
                      {log.feedback === 'incomplete' && (
                        <span className="px-2 py-0.5 rounded-md bg-[#FFF3E0] text-[#E65100] font-medium text-[11px]">
                          ⚠️ ไม่ครบ
                        </span>
                      )}
                      {log.feedback === 'incorrect' && (
                        <span className="px-2 py-0.5 rounded-md bg-[#FFEBEE] text-[#C62828] font-medium text-[11px]">
                          ❌ ผิด
                        </span>
                      )}
                      {!log.feedback && (
                        <span className="text-[#99A89D] text-[11px]">-</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                      {onDeleteLog && (
                        <button
                          onClick={() => {
                            if (window.confirm(`ต้องการลบประวัติคำถาม "${log.question}" ใช่หรือไม่?`)) {
                              onDeleteLog(log.id);
                            }
                          }}
                          className="p-1.5 text-[#C62828] hover:bg-[#FEECEB] rounded-lg transition-colors cursor-pointer"
                          title="ลบรายการนี้ออกจากประวัติ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
