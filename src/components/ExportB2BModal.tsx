import React, { useState } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  Copy,
  Calendar,
  Check,
  Building2,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { B2BLead, B2BAppointment } from '../types';
import {
  exportLeadsToCsv,
  exportAppointmentsToCsv,
  exportDataToJson,
  copyLeadsToClipboardTsv,
} from '../utils/b2bExport';

interface ExportB2BModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: B2BLead[];
  appointments: B2BAppointment[];
  filteredLeadsCount: number;
}

export const ExportB2BModal: React.FC<ExportB2BModalProps> = ({
  isOpen,
  onClose,
  leads,
  appointments,
  filteredLeadsCount,
}) => {
  const [copied, setCopied] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'filtered'>('all');

  if (!isOpen) return null;

  const targetLeads = exportScope === 'filtered' ? leads.slice(0, filteredLeadsCount) : leads;

  const handleCopyTsv = async () => {
    const ok = await copyLeadsToClipboardTsv(targetLeads);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        window.print();
        return;
      }

      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>รายงาน B2B Corporate Leads - บ้านโฮม สวนอาหาร&รีสอร์ท</title>
        <style>
          body { font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; color: #1e293b; }
          h1 { color: #164e33; font-size: 20px; margin-bottom: 4px; }
          .sub { color: #64748b; font-size: 12px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; color: #0f172a; font-weight: bold; }
          .priority-A { background: #fee2e2; color: #991b1b; font-weight: bold; text-align: center; }
          .priority-B { background: #fef3c7; color: #92400e; font-weight: bold; text-align: center; }
          .priority-C { background: #dcfce7; color: #166534; font-weight: bold; text-align: center; }
        </style>
      </head>
      <body>
        <h1>บ้านโฮม สวนอาหาร&รีสอร์ท กาฬสินธุ์</h1>
        <div class="sub">รายงานรายชื่อศูนย์ประสานงานและหน่วยงาน B2B ทั้งหมด ${targetLeads.length} รายการ (พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH')})</div>
        <table>
          <thead>
            <tr>
              <th width="45">ลำดับ</th>
              <th width="60">ID</th>
              <th width="50">ระดับ</th>
              <th>ชื่อศูนย์ประสานงาน / หน่วยงาน</th>
              <th>ประเภท</th>
              <th>ผู้ประสานงาน / เบอร์โทร</th>
              <th>ข้อเสนอที่ควรชู</th>
              <th>สถานะ Pipeline</th>
              <th>นัดหมายล่าสุด</th>
            </tr>
          </thead>
          <tbody>
            ${targetLeads
              .map(
                (l, idx) => `
              <tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td><strong>${l.id}</strong></td>
                <td class="priority-${l.priority}">${l.priority}</td>
                <td><strong>${l.name}</strong></td>
                <td>${l.orgType || l.categoryType || '-'}</td>
                <td>${l.contactPerson || '-'} ${l.phone ? `<br>📞 ${l.phone}` : ''}</td>
                <td>${l.offer || l.proposalOffer || '-'}</td>
                <td>${l.pipelineStage || l.contactStatus || 'ยังไม่ติดต่อ'}</td>
                <td>${l.appointmentDate || '-'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 400);
    } catch {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full my-6 overflow-hidden border border-[#E3ECE1] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1B3E2D] to-[#2B543F] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Download className="w-5 h-5 text-[#E6F4EA]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">ส่งออกข้อมูล B2B & กำหนดการนัดหมาย</h2>
              <p className="text-xs text-[#C5E1D0]">
                เลือกฟอร์แมตที่ต้องการใช้งาน ข้อมูลภาษาไทยสมบูรณ์ 100%
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 transition-colors text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 text-sm text-[#1B3E2D]">
          {/* Scope Selector */}
          <div className="bg-[#F6F9F5] p-3 rounded-2xl border border-[#E2EBE0] flex items-center justify-between">
            <span className="text-xs font-bold text-[#305340]">เลือกชุดข้อมูลที่ต้องการส่งออก:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  exportScope === 'all'
                    ? 'bg-[#2D5A43] text-white shadow-sm'
                    : 'bg-white text-[#527260] border border-[#DCE7DA]'
                }`}
              >
                ทั้งหมด ({leads.length} หน่วยงาน)
              </button>
              <button
                type="button"
                onClick={() => setExportScope('filtered')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  exportScope === 'filtered'
                    ? 'bg-[#2D5A43] text-white shadow-sm'
                    : 'bg-white text-[#527260] border border-[#DCE7DA]'
                }`}
              >
                ตามตัวกรองปัจจุบัน ({filteredLeadsCount})
              </button>
            </div>
          </div>

          {/* Export Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* 1. CSV / Excel (UTF-8 BOM) */}
            <div className="p-4 rounded-2xl border border-[#DCE7DA] bg-white hover:border-[#2D5A43] hover:shadow-md transition-all flex flex-col justify-between space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EAF5EC] text-[#1E7438] flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-[#1B3E2D] text-sm">
                    Microsoft Excel (CSV UTF-8)
                  </h4>
                  <p className="text-[11px] text-[#607D6E] leading-relaxed">
                    มี UTF-8 BOM ในตัว เปิดใน Excel ได้ทันที ภาษาไทยไม่เพี้ยน ฟิลด์ละเอียดครบ 19 คอลัมน์
                  </p>
                </div>
              </div>
              <button
                onClick={() => exportLeadsToCsv(targetLeads)}
                className="w-full py-2 px-3 rounded-xl bg-[#1E7438] hover:bg-[#165a2b] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด Excel CSV</span>
              </button>
            </div>

            {/* 2. Appointments Schedule CSV */}
            <div className="p-4 rounded-2xl border border-[#DCE7DA] bg-white hover:border-[#2D5A43] hover:shadow-md transition-all flex flex-col justify-between space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-[#1B3E2D] text-sm">
                    กำหนดการนัดหมาย (Appointments)
                  </h4>
                  <p className="text-[11px] text-[#607D6E] leading-relaxed">
                    ส่งออกตารางนัดหมายทั้งหมด {appointments.length} รายการ (วัน, เวลา, สถานที่, วัตถุประสงค์, ผู้รับผิดชอบ)
                  </p>
                </div>
              </div>
              <button
                onClick={() => exportAppointmentsToCsv(appointments)}
                className="w-full py-2 px-3 rounded-xl bg-[#1A73E8] hover:bg-[#1557b0] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลดตารางนัดหมาย</span>
              </button>
            </div>

            {/* 3. Quick Copy for Google Sheets */}
            <div className="p-4 rounded-2xl border border-[#DCE7DA] bg-white hover:border-[#2D5A43] hover:shadow-md transition-all flex flex-col justify-between space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FFF4E5] text-[#B76E00] flex items-center justify-center shrink-0">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-[#1B3E2D] text-sm">
                    คัดลอกลง Google Sheets / Excel
                  </h4>
                  <p className="text-[11px] text-[#607D6E] leading-relaxed">
                    คัดลอกเป็นตาราง (TSV) กดวาง (Ctrl+V) ลงในช่องสเปรดชีตได้ทันทีโดยไม่ต้องเปิดไฟล์
                  </p>
                </div>
              </div>
              <button
                onClick={handleCopyTsv}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#B76E00] hover:bg-[#965a00] text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>คัดลอกลงคลิปบอร์ดแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกข้อมูลตาราง (TSV)</span>
                  </>
                )}
              </button>
            </div>

            {/* 4. Print / PDF Summary */}
            <div className="p-4 rounded-2xl border border-[#DCE7DA] bg-white hover:border-[#2D5A43] hover:shadow-md transition-all flex flex-col justify-between space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F3E8FD] text-[#7E22CE] flex items-center justify-center shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-[#1B3E2D] text-sm">
                    พิมพ์รายงาน / สั่งพิมพ์ PDF
                  </h4>
                  <p className="text-[11px] text-[#607D6E] leading-relaxed">
                    เปิดหน้าตารางรายงานสรุปพร้อมสั่ง Print หรือ Save as PDF ได้อย่างสวยงาม
                  </p>
                </div>
              </div>
              <button
                onClick={handlePrint}
                className="w-full py-2 px-3 rounded-xl bg-[#7E22CE] hover:bg-[#681ba8] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>เปิดหน้าพิมพ์ / PDF</span>
              </button>
            </div>
          </div>

          {/* Backup JSON export */}
          <div className="pt-2 border-t border-[#E5EFE3] flex items-center justify-between text-xs">
            <span className="text-[#6C8879]">
              ต้องการสำรองข้อมูลเชิงโครงสร้างทั้งหมด (Raw Data):
            </span>
            <button
              onClick={() =>
                exportDataToJson({
                  exportDate: new Date().toISOString(),
                  totalLeads: leads.length,
                  leads: targetLeads,
                  appointments,
                })
              }
              className="text-[#2D5A43] hover:underline font-bold flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ดาวน์โหลดสำรองไฟล์ JSON</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#F8FAF7] px-6 py-4 border-t border-[#E3ECE1] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#527260] hover:bg-[#EAEFE9] transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
