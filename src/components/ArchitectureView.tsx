import React from 'react';
import {
  Layers,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  ArrowRight,
  Database,
  Bot,
  RefreshCw,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import { KNOWLEDGE_CATEGORIES } from '../data/categories';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-[#1B3D2F] to-[#2B5441] text-white p-6 rounded-2xl shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-[#E2BE76] text-[#1B3D2F] rounded-xl font-bold">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold">
              สถาปัตยกรรมระบบ “น้องโฮม” (Google Workspace Integration Flow)
            </h3>
            <p className="text-xs text-[#BED2C4]">
              แบบแปลนโครงสร้างการเชื่อมต่อ Google Docs เป็น Knowledge Base และ Google Sheets สำหรับบันทึกประวัติ
            </p>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-[#E2ECE4] mt-2 leading-relaxed">
          ตามเงื่อนไขที่ผู้ว่าจ้างกำหนด: เริ่มต้นจากการออกแบบโครงสร้าง UI, Cards และ User Flow ให้เห็นภาพชัดเจน 100% ก่อนทำการผูก API จริงกับ Google Cloud Platform / Workspace Service Account
        </p>
      </div>

      {/* 3-Step Flow Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 */}
        <div className="bg-[#FAF8F3] rounded-2xl border border-[#D5DDD2] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#E5EFE2] text-[#24583C]">
                STEP 1: Knowledge Source
              </span>
              <FileText className="w-5 h-5 text-[#2D5A43]" />
            </div>
            <h4 className="text-base font-bold text-[#1D3528] mb-1.5">
              Google Docs (12 หมวดหมู่)
            </h4>
            <p className="text-xs text-[#5D7063] leading-relaxed mb-3">
              เอกสารต้นฉบับที่พนักงานและหัวหน้าแต่ละฝ่ายอัปเดตอยู่แล้วใน Google Drive จัดหมวดหมู่ตาม Business Profile, Restaurant, Resort, Pool Villa, Mini MICE, SOP, ฯลฯ
            </p>
            <ul className="text-xs space-y-1.5 text-[#354B3E]">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A43]"></span>
                <span>อ่านข้อมูลผ่าน Google Docs API</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A43]"></span>
                <span>ดึงหัวข้อ ลำดับข้อ และวันที่อัปเดตล่าสุด</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A43]"></span>
                <span>อ้างอิงชื่อไฟล์และหมวดในคำตอบเสมอ</span>
              </li>
            </ul>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E8E1D3] text-[11px] text-[#697E70] font-mono">
            BaanHome_Doc_01 ... BaanHome_Doc_12
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-[#FAF8F3] rounded-2xl border border-[#D5DDD2] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#E3EFF8] text-[#1E6796]">
                STEP 2: น้องโฮม Processing
              </span>
              <Bot className="w-5 h-5 text-[#1E6796]" />
            </div>
            <h4 className="text-base font-bold text-[#1D3528] mb-1.5">
              Strict Matching & Structured Card
            </h4>
            <p className="text-xs text-[#5D7063] leading-relaxed mb-3">
              ประมวลผลคำถาม แปลงเป็น Structured Answer Card 6 ส่วน (คำตอบสรุป, ข้อมูลละเอียด, ข้อความพร้อมส่งลูกค้า, สิ่งที่ควรทำต่อ, แหล่งข้อมูล, Feedback)
            </p>
            <ul className="text-xs space-y-1.5 text-[#354B3E]">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#238636] shrink-0" />
                <span className="font-semibold text-[#183F28]">ห้ามเดาคำตอบ (Anti-Hallucination)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-[#B07219] shrink-0" />
                <span>หากไม่พบ ให้แจ้งและลงคิว Unanswered</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D5A43] shrink-0" />
                <span>มีปุ่ม Copy ข้อความพร้อมส่งลูกค้าทันที</span>
              </li>
            </ul>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E8E1D3] text-[11px] text-[#697E70] font-mono">
            Structured Card: 6 Section Layout
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-[#FAF8F3] rounded-2xl border border-[#D5DDD2] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#E8F5E9] text-[#2E7D32]">
                STEP 3: Sheets Telemetry
              </span>
              <FileSpreadsheet className="w-5 h-5 text-[#2E7D32]" />
            </div>
            <h4 className="text-base font-bold text-[#1D3528] mb-1.5">
              Google Sheets (9 คอลัมน์)
            </h4>
            <p className="text-xs text-[#5D7063] leading-relaxed mb-3">
              บันทึกคำถาม-คำตอบลงใน Spreadsheet ทุกครั้งแบบเรียลไทม์ พร้อมติดตาม Feedback จากพนักงานเพื่อใช้อัปเดตเอกสารอย่างต่อเนื่อง
            </p>
            <div className="text-[11px] bg-white p-2.5 rounded-lg border border-[#CCD8CB] space-y-1 font-mono text-[#3E5547]">
              <div>1. วันที่เวลา | 2. ผู้ถาม | 3. แผนก</div>
              <div>4. คำถาม | 5. คำตอบ | 6. หมวด</div>
              <div>7. แหล่งข้อมูล | 8. พบหรือไม่ | 9. Feedback</div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E8E1D3] text-[11px] text-[#697E70] font-mono">
            BaanHome_Staff_Inquiry_Log_2026.gsheet
          </div>
        </div>
      </div>

      {/* Confirmation Checklist */}
      <div className="bg-[#EEF5EC] rounded-2xl border border-[#CDE1C8] p-5">
        <h4 className="font-bold text-[#1B3F28] text-sm mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#2D5A43]" />
          <span>สิ่งที่พร้อมส่งมอบในการตรวจสอบโครงสร้างหน้าจอ (UI & Flow Prototype):</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#2A4433]">
          <div className="p-3 bg-white rounded-xl border border-[#D3E3D0]">
            <strong>✓ ดีไซน์ Mood & Tone:</strong> โทนเขียวธรรมชาติ-ครีม สไตล์รีสอร์ทบ้านโฮม สบายตา ใช้งานง่ายทั้งมือถือและเดสก์ท็อป
          </div>
          <div className="p-3 bg-white rounded-xl border border-[#D3E3D0]">
            <strong>✓ หน้าแรกครบ 5 องค์ประกอบ:</strong> Header น้องโฮม, ช่องค้นหา, หัวข้อพบบ่อย, 12 หมวดความรู้, และประวัติคำถามล่าสุด
          </div>
          <div className="p-3 bg-white rounded-xl border border-[#D3E3D0]">
            <strong>✓ Structured Answer Card:</strong> แยก 6 ส่วนชัดเจน พร้อมปุ่มคัดลอกส่งลูกค้า และปุ่มให้ Feedback
          </div>
          <div className="p-3 bg-white rounded-xl border border-[#D3E3D0]">
            <strong>✓ ระบบตรวจจับคำถามไม่พบ:</strong> ไม่เดาคำตอบ แสดงข้อความแจ้งเตือน และบันทึกลง Unanswered Questions
          </div>
          <div className="p-3 bg-white rounded-xl border border-[#D3E3D0]">
            <strong>✓ จำลอง Google Sheets 9 คอลัมน์:</strong> ดูประวัติ กรองตามสถานะ และ Export CSV ได้ทันที
          </div>
          <div className="p-3 bg-white rounded-xl border border-[#D3E3D0]">
            <strong>✓ เปลี่ยนแผนกผู้ใช้งานได้:</strong> สามารถสลับแผนก เช่น Front Office, Reservation, F&B, Housekeeping เพื่อทดสอบ
          </div>
        </div>
      </div>
    </div>
  );
};
