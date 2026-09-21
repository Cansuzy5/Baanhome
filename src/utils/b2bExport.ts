import { B2BLead, B2BAppointment } from '../types';

/**
 * Utility functions to export B2B Lead and Appointment data in various formats.
 * Includes UTF-8 BOM so Microsoft Excel opens Thai text correctly without encoding corruption.
 */

// Helper to escape CSV cell content
function escapeCsvCell(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Export B2B Leads to CSV with UTF-8 BOM
 */
export function exportLeadsToCsv(leads: B2BLead[], filename = 'BaanHome_B2B_Partnerships_Leads.csv'): void {
  const headers = [
    'รหัส (ID)',
    'ชื่อองค์กร / ศูนย์ประสานงาน',
    'ระดับความสำคัญ (Priority)',
    'ประเภทหน่วยงาน (Org Type)',
    'สถานะ Pipeline',
    'ชื่อผู้ติดต่อฝั่งลูกค้า',
    'ตำแหน่งผู้ติดต่อฝั่งลูกค้า',
    'เบอร์โทรศัพท์ติดต่อ',
    'อีเมล / ช่องทางติดต่อ',
    'ประเภทงาน',
    'จำนวนผู้เข้าร่วมโดยประมาณ',
    'วันที่ลูกค้าคาดว่าจะจัดงาน',
    'รายละเอียดความต้องการ',
    'ผู้ประสานงานบ้านโฮม',
    'เบอร์ผู้ประสานงานบ้านโฮม',
    'ข้อเสนอที่ควรชู (Offer)',
    'รายละเอียดข้อเสนอเพิ่มเติม',
    'รูปแบบความร่วมมือ (Cooperation)',
    'เหตุผลที่ควรเข้าหา (Reasons)',
    'แผนดำเนินการถัดไป (Next Action)',
    'วันนัดหมายล่าสุด',
    'เวลานัดหมาย',
    'งบประมาณประมาณการ',
    'จำนวนผู้เข้าร่วมประมาณการ',
    'บันทึกเพิ่มเติม (Notes)',
    'วันที่อัปเดตล่าสุด',
  ];

  const rows = leads.map((l) => [
    escapeCsvCell(l.id),
    escapeCsvCell(l.name),
    escapeCsvCell(`Priority ${l.priority}`),
    escapeCsvCell(l.orgType || l.categoryType || 'หน่วยงานทั่วไป'),
    escapeCsvCell(l.pipelineStage || l.contactStatus || 'ยังไม่ติดต่อ'),
    escapeCsvCell(l.contactPerson || ''),
    escapeCsvCell(l.contactPosition || ''),
    escapeCsvCell(l.phone || ''),
    escapeCsvCell(l.email || l.lineId || ''),
    escapeCsvCell(l.eventType || ''),
    escapeCsvCell(l.attendeesEstimate || ''),
    escapeCsvCell(l.eventDate || ''),
    escapeCsvCell(l.eventRequirements || ''),
    escapeCsvCell(l.baanHomeCoordinatorName || ''),
    escapeCsvCell(l.baanHomeCoordinatorPhone || ''),
    escapeCsvCell(l.featuredOffers?.join(' | ') || l.offer || l.proposalOffer || ''),
    escapeCsvCell(l.offerDetails || ''),
    escapeCsvCell(l.cooperationType || ''),
    escapeCsvCell(l.reasonsToApproach || ''),
    escapeCsvCell(l.nextAction || ''),
    escapeCsvCell(l.appointmentDate || ''),
    escapeCsvCell(l.appointmentTime || ''),
    escapeCsvCell(l.estimatedBudget || ''),
    escapeCsvCell(l.attendeesEstimate || ''),
    escapeCsvCell(l.notes || ''),
    escapeCsvCell(l.updatedAt || new Date().toISOString().split('T')[0]),
  ]);

  // \uFEFF is the UTF-8 Byte Order Mark (BOM) for Excel compatibility
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export Appointments to CSV with UTF-8 BOM
 */
export function exportAppointmentsToCsv(
  appointments: B2BAppointment[],
  filename = 'BaanHome_B2B_Appointments_Schedule.csv'
): void {
  const headers = [
    'รหัสการนัด',
    'รหัสหน่วยงาน',
    'ชื่อหน่วยงาน / ศูนย์ประสานงาน',
    'วันที่นัดหมาย (Date)',
    'เวลา (Time)',
    'หัวข้อ / ชื่องาน',
    'สถานที่นัดหมาย (Location)',
    'วัตถุประสงค์การนัดหมาย',
    'สถานะนัดหมาย',
    'ระดับความสำคัญ',
    'ผู้ติดต่อฝั่งลูกค้า',
    'เบอร์โทรศัพท์',
    'จำนวนผู้เข้าร่วมประมาณการ',
    'ผู้รับผิดชอบ (Staff)',
    'บันทึกรายละเอียดนัดหมาย',
    'วันที่สร้างรายการ',
  ];

  const rows = appointments.map((a) => [
    escapeCsvCell(a.id),
    escapeCsvCell(a.leadId || ''),
    escapeCsvCell(a.leadName),
    escapeCsvCell(a.date),
    escapeCsvCell(a.time),
    escapeCsvCell(a.title),
    escapeCsvCell(a.location),
    escapeCsvCell(a.objective),
    escapeCsvCell(
      a.status === 'scheduled'
        ? 'รอเข้าพบ'
        : a.status === 'completed'
        ? 'พบแล้ว'
        : a.status === 'not_met'
        ? 'ไม่ได้เข้าพบ'
        : a.status === 'rescheduled'
        ? 'เลื่อนนัด'
        : 'ยกเลิกนัด'
    ),
    escapeCsvCell(a.priority || '-'),
    escapeCsvCell(a.contactPerson || ''),
    escapeCsvCell(a.phone || ''),
    escapeCsvCell(a.attendeesCount || ''),
    escapeCsvCell(a.assignedStaff || ''),
    escapeCsvCell(a.notes || ''),
    escapeCsvCell(a.createdAt),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export Data to JSON file
 */
export function exportDataToJson(data: unknown, filename = 'BaanHome_B2B_Export.json'): void {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadBlob(jsonContent, filename, 'application/json;charset=utf-8;');
}

/**
 * Copy data as Tab-Separated Values (TSV) for direct paste into Excel / Google Sheets
 */
export async function copyLeadsToClipboardTsv(leads: B2BLead[]): Promise<boolean> {
  const headers = [
    'ID',
    'ชื่อองค์กร',
    'Priority',
    'ประเภท',
    'สถานะ',
    'ผู้ประสานงาน',
    'เบอร์โทร',
    'ข้อเสนอที่ควรชู',
    'รูปแบบงาน',
    'นัดหมายล่าสุด',
    'บันทึก',
  ];

  const rows = leads.map((l) => [
    l.id,
    l.name,
    l.priority,
    l.orgType || l.categoryType || '',
    l.pipelineStage || l.contactStatus || '',
    l.contactPerson || '',
    l.phone || '',
    l.offer || l.proposalOffer || '',
    l.format || l.opportunity || '',
    l.appointmentDate ? `${l.appointmentDate} ${l.appointmentTime || ''}` : '',
    l.notes || '',
  ]);

  const tsv = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');

  try {
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch {
    return false;
  }
}

/**
 * Browser download helper
 */
function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
