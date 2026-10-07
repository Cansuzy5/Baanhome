// Conservative, explicit aliases: never fuzzy-match prices, dates or record IDs.
export function normalizeSearchText(value: string): string {
  return value.normalize('NFKC').toLowerCase()
    .replace(/พูลวิลล?่า|พูลวิลล?า|pool[\s-]*villa/g, 'พูลวิลล่า')
    .replace(/เช็คอิน|เช็กอิน|เชคอิน|check[\s-]*in/g, 'เช็คอิน')
    .replace(/เช็คเอาท์|เช็กเอาต์|เชคเอ้า|check[\s-]*out/g, 'เช็คเอาท์')
    .replace(/รีสอท|รีสอร์ต|resort/g, 'รีสอร์ท')
    .replace(/สัมณา|สัมนา|seminar|meeting room/g, 'สัมมนา')
    .replace(/บุฟเฟ่ต์|บุฟเฟ่|buffet/g, 'บุฟเฟต์')
    .replace(/breakfast/g, 'อาหารเช้า')
    .replace(/น้องหมา|น้องแมว|สุนัข|แมว|หมา(?![ยกดง])|\bpets?\b/g, 'สัตว์เลี้ยง')
    .replace(/เข้าก่อนเวลา|เข้าพักก่อนเวลา|early[\s-]*check[\s-]*in/g, 'เช็คอินก่อนเวลา')
    .replace(/รับได้กี่คน|รองรับกี่คน|พักได้กี่คน|นอนได้กี่คน/g, 'จำนวนคน')
    .replace(/ที่นั่งส่วนตัว|ห้องส่วนตัว/g, 'ห้อง vip')
    .replace(/\s+/g, ' ').trim();
}

export function searchTopics(query: string): string[][] {
  const topics = [
    ['สัตว์เลี้ยง'], ['อาหารเช้า'], ['เช็คอิน'], ['เช็คเอาท์'],
    ['มัดจำ', 'โอนเงิน', 'เลขบัญชี', 'ชำระเงิน'],
    ['ยกเลิก', 'คืนเงิน', 'refund'],
    ['จำนวนคน', 'รองรับ', 'ผู้เข้าพัก', 'ท่าน', 'คน'],
    ['ราคา', 'กี่บาท', 'เท่าไหร่', 'ค่าบริการ'],
    ['ประชุม', 'สัมมนา', 'จัดเลี้ยง', 'ห้อง vip'],
  ];
  return topics.filter(terms => terms.some(term => query.includes(term)));
}
