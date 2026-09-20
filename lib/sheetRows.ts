// Columns match the supplied workbook. Extra application fields live in O/P.
const text = (value: any) => value == null ? '' : String(value);
const date = (value: any) => /^\d{4}-\d{2}-\d{2}/.test(text(value)) ? text(value).slice(0, 10) : text(value);
const statuses: Record<string, string> = { 'รอดำเนินการ (Scheduled)': 'scheduled', 'เรียบร้อย (Completed)': 'completed', 'เลื่อนนัด (Rescheduled)': 'rescheduled', 'ยกเลิก (Cancelled)': 'cancelled', 'นัดหมายแล้ว': 'scheduled', 'รอดำเนินการ': 'scheduled', 'เสร็จสิ้น': 'completed', 'เลื่อนนัด': 'rescheduled', 'ยกเลิก': 'cancelled' };
export function questionRow(item: any) {
  return [item.id, item.timestamp, item.staffName, item.department, item.question, item.answerSummary || '', item.category || '', item.sourceDoc || '', item.found === true, item.feedback || '', item.feedbackNote || '', item.recordType || '', item.recordType === 'unanswered' ? JSON.stringify({ status: item.status, suggestedCategory: item.suggestedCategory, targetDoc: item.targetDoc, adminNotes: item.adminNotes }) : ''];
}
export function readQuestion(row: any[]) {
  let workflow: any = {};
  try { workflow = JSON.parse(text(row[12]) || '{}'); } catch {}
  const feedback: Record<string,string> = { 'ถูกต้อง': 'accurate', 'ตกหล่นบางส่วน': 'incomplete', 'ไม่ถูกต้อง': 'incorrect' };
  return { id: text(row[0]), timestamp: text(row[1]), staffName: text(row[2]), department: text(row[3]), question: text(row[4]), answerSummary: text(row[5]), category: text(row[6]), sourceDoc: text(row[7]), found: row[8] === true || ['true', 'พบ', 'พบข้อมูล', 'พบคำตอบ', 'ค้นพบ', 'พบคำตอบในคู่มือ'].includes(text(row[8]).toLowerCase()), feedback: feedback[text(row[9])] || (['accurate','incomplete','incorrect'].includes(text(row[9])) ? text(row[9]) : undefined), feedbackNote: text(row[10]) || undefined, recordType: text(row[11]), status: workflow.status || 'pending', suggestedCategory: workflow.suggestedCategory, targetDoc: workflow.targetDoc, adminNotes: workflow.adminNotes };
}
export function appointmentRow(item: any) {
  return [item.id, item.createdAt, item.leadName, item.priority || '', item.contactPerson || '', item.phone || '', item.objective || 'อื่นๆ', item.date, item.time, item.location, item.attendeesCount ?? '', item.assignedStaff || '', item.status, item.notes || '', item.title, JSON.stringify({ leadId: item.leadId, updatedAt: item.updatedAt })];
}
export function readAppointment(row: any[]) {
  let extra: any = {};
  try { extra = JSON.parse(text(row[15]) || '{}'); } catch {}
  const time = text(row[8]);
  const count = parseFloat(text(row[10]).replace(/,/g, ''));
  return { id: text(row[0]), createdAt: text(row[1]), leadName: text(row[2]), priority: text(row[3]) || undefined, contactPerson: text(row[4]), phone: text(row[5]), objective: text(row[6]) || 'อื่นๆ', date: date(row[7]), time: time.includes('T') ? time.slice(11,16) : time, location: text(row[9]), attendeesCount: Number.isFinite(count) ? count : undefined, assignedStaff: text(row[11]), status: statuses[text(row[12])] || text(row[12]) || 'scheduled', notes: text(row[13]), title: text(row[14]) || text(row[6]) || text(row[2]), leadId: extra.leadId, updatedAt: extra.updatedAt };
}
