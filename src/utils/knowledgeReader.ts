import type { KnowledgeItem } from '../types';
export const READER_TITLES: Record<string, string> = {
  restaurant: 'สวนอาหารและเมนู', 'resort-knowledge': 'รีสอร์ท', 'pool-villa': 'พูลวิลล่า',
  'mini-mice': 'จัดเลี้ยงและ Mini MICE', 'promotion-package': 'โปรโมชั่นและแพ็กเกจ',
  'customer-service': 'การบริการลูกค้า', reservation: 'การจองและเงื่อนไข',
  'sop-operation': 'คู่มือปฏิบัติงาน', 'faq-problems': 'การแก้ปัญหาหน้างาน',
  'business-profile': 'รู้จักบ้านโฮม', 'kc-corporation': 'KC Corporation',
  'employee-welfare': 'สวัสดิการพนักงาน', 'competitor-battlecard': 'ข้อมูลคู่แข่งสำหรับพนักงาน',
  'quotation-policy': 'ใบเสนอราคาและนโยบาย',
};
export function readerParagraphs(item: KnowledgeItem): string[] {
  // Reading uses current records, never a generated rewrite or copied database.
  const blocks = [item.summary, ...(item.detail || []), item.customerMessage].filter(p => typeof p === 'string' && p.trim()).map(p => p.trim());
  return [...new Set(blocks)];
}
export function readerChapters(items: KnowledgeItem[], category: string) {
  const selected = items.filter(i => i.category === category);
  if (category !== 'restaurant') return [{ title: 'เนื้อหา', items: selected }].filter(c => c.items.length);
  const menuIds = new Set(selected.filter(i => /เมนู|อาหารแนะนำ|Signature Dish|ลาบปลาตะเพียน|อาหารจาน|เครื่องดื่ม|เซตไก่/.test(i.title)).map(i => i.id));
  return [
    { title: 'เมนูอาหารและเครื่องดื่ม', items: selected.filter(i => menuIds.has(i.id)) },
    { title: 'ข้อมูลและบริการสวนอาหาร', items: selected.filter(i => !menuIds.has(i.id)) },
  ].filter(c => c.items.length);
}
export function readerHeading(title: string): string {
  // Heading-only presentation changes; original title stays in source metadata.
  return title.replace(/\s*\?\s*$/, '').replace(/ราคาเท่าไหร่/g, 'ราคาและรายละเอียด').replace(/รองรับกี่คน/g, 'จำนวนคนที่รองรับ').replace(/มี Facility อะไรบ้าง/g, 'สิ่งอำนวยความสะดวก').replace(/สวนอาหารมีโซนอะไรบ้าง/g, 'โซนสวนอาหาร');
}
