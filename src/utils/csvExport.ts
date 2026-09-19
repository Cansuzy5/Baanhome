import { QuestionLog, UnansweredQuestion } from '../types';

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: 'text/csv;charset=utf-8;' }); // \uFEFF for Excel UTF-8 BOM
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportQuestionLogsToCSV(logs: QuestionLog[]) {
  const headers = ['ID', 'วันที่-เวลา', 'ชื่อผู้ถาม', 'แผนก', 'คำถาม', 'สรุปคำตอบ', 'หมวดหมู่', 'ค้นพบหรือไม่', 'ความเห็น (Feedback)', 'หมายเหตุความเห็น'];
  
  const rows = logs.map(log => [
    log.id,
    `"${log.timestamp}"`,
    `"${log.staffName}"`,
    `"${log.department}"`,
    `"${(log.question || '').replace(/"/g, '""')}"`,
    `"${(log.answerSummary || '').replace(/"/g, '""')}"`,
    `"${log.category}"`,
    log.found ? 'Yes' : 'No',
    log.feedback || '-',
    `"${(log.feedbackNote || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  downloadCSV(csvContent, `ประวัติการค้นหา_QA_${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportUnansweredToCSV(questions: UnansweredQuestion[]) {
  const headers = ['ID', 'วันที่-เวลา', 'ชื่อผู้ถาม', 'แผนก', 'คำถาม', 'สถานะ', 'หมวดหมู่ที่แนะนำ', 'บันทึกจากผู้ดูแล (Admin Notes)'];
  
  const rows = questions.map(q => [
    q.id,
    `"${q.timestamp}"`,
    `"${q.staffName}"`,
    `"${q.department}"`,
    `"${(q.question || '').replace(/"/g, '""')}"`,
    q.status,
    `"${q.suggestedCategory || '-'}"`,
    `"${(q.adminNotes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  downloadCSV(csvContent, `คำถามที่ไม่มีคำตอบ_${new Date().toISOString().split('T')[0]}.csv`);
}
