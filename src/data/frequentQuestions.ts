import { StaffProfile } from '../types';

export interface FrequentTopic {
  id: string;
  title: string;
  query: string;
  category: string;
  badge: string;
  icon: string;
}

export const FREQUENT_TOPICS: FrequentTopic[] = [
  {
    id: 'faq-location',
    title: 'บ้านโฮมอยู่ที่ไหน ขอแผนที่ Google Maps และพิกัด',
    query: 'บ้านโฮมอยู่ที่ไหน ขอแผนที่',
    category: 'Business Profile',
    badge: 'BH-002',
    icon: 'MapPin',
  },
  {
    id: 'faq-checkin',
    title: 'เวลา Check-in / Check-out เข้าพักและออกกี่โมง',
    query: 'เวลา Check-in / Check-out',
    category: 'Reservation',
    badge: 'BH-018',
    icon: 'Clock',
  },
  {
    id: 'faq-pets',
    title: 'สัตว์เลี้ยงเข้าพักได้ไหม สุนัข แมว คิดค่าบริการเท่าไร',
    query: 'สัตว์เลี้ยงเข้าพักได้ไหม',
    category: 'Resort',
    badge: 'BH-020',
    icon: 'PawPrint',
  },
  {
    id: 'faq-poolvilla-price',
    title: 'ราคาพูลวิลล่า กลางนาบน กลางนาล่าง อิงน้ำ ร่มไม้',
    query: 'ราคาพูลวิลล่า',
    category: 'Pool Villa',
    badge: 'BH-022',
    icon: 'Waves',
  },
  {
    id: 'faq-resort-price',
    title: 'ราคาห้องพักรีสอร์ท 590 และ 790 บาท',
    query: 'ราคาห้องพักรีสอร์ท',
    category: 'Resort',
    badge: 'BH-014',
    icon: 'Hotel',
  },
  {
    id: 'faq-pool-rules',
    title: 'สระว่ายน้ำเปิดกี่โมง ลึกเท่าไหร่ และกฎการใช้สระ',
    query: 'สระว่ายน้ำเปิดกี่โมง / ลึกเท่าไหร่',
    category: 'Pool Villa',
    badge: 'BH-025',
    icon: 'Waves',
  },
  {
    id: 'faq-vip-restaurant',
    title: 'ห้อง VIP ใหญ่ / VIP เล็ก สวนอาหาร จุได้กี่คน',
    query: 'VIP ใหญ่รองรับกี่คน',
    category: 'Restaurant',
    badge: 'BH-008',
    icon: 'UtensilsCrossed',
  },
  {
    id: 'faq-minimice',
    title: 'Mini MICE ประชุม สัมมนา งานเลี้ยง รองรับอะไรบ้าง',
    query: 'Mini MICE รองรับอะไรบ้าง',
    category: 'Mini MICE',
    badge: 'BH-027',
    icon: 'Users',
  },
  {
    id: 'faq-competitor-rimpao',
    title: 'สรุปเปรียบเทียบ: โรงแรมริมปาว vs Baan Home Mini MICE',
    query: 'เปรียบเทียบโรงแรมริมปาว',
    category: 'Battlecard',
    badge: 'KH-278',
    icon: 'Target',
  },
  {
    id: 'faq-competitor-pitch',
    title: 'สคริปต์การขาย: ลูกค้าเทียบโรงแรมใหญ่ ทำไมต้องเลือกบ้านโฮม',
    query: 'สคริปต์สู้คู่แข่งโรงแรมใหญ่',
    category: 'Battlecard',
    badge: 'KH-301',
    icon: 'Sparkles',
  },
];

export const MOCK_STAFF_PROFILES: StaffProfile[] = [
  {
    id: 'usr_admin',
    username: 'admin',
    name: 'คุณผู้จัดการศิริชัย (Admin)',
    department: 'ฝ่ายขายและการตลาด (Sales & MICE)',
    avatar: '👨🏻‍💼',
    role: 'Administrator',
    status: 'active',
  },
  {
    id: 'usr_operator',
    username: 'operator',
    name: 'น้องพลอย ต้อนรับ (Operator)',
    department: 'ต้อนรับส่วนหน้า (Front Office)',
    avatar: '👩🏻‍💼',
    role: 'Operator',
    status: 'active',
  },
  {
    id: 'usr_kuser',
    username: 'kuser',
    name: 'คุณสมชาย บริการ (Knowledge User)',
    department: 'อาหารและเครื่องดื่ม (F&B)',
    avatar: '👨🏻‍🍳',
    role: 'Knowledge User',
    status: 'active',
  },
  {
    id: 'staff-2',
    username: 'naphat',
    name: 'คุณณภัทร (Naphat)',
    department: 'สำรองห้องพัก (Reservation)',
    avatar: '👨🏻‍💻',
    role: 'Operator',
    status: 'active',
  },
  {
    id: 'staff-4',
    username: 'somchai_hk',
    name: 'พี่สมชาย (Somchai)',
    department: 'แม่บ้านและบริการห้องพัก (Housekeeping)',
    avatar: '👨🏻‍🔧',
    role: 'Knowledge User',
    status: 'active',
  },
  {
    id: 'staff-6',
    username: 'thicha',
    name: 'คุณธิชา (Thicha)',
    department: 'ลูกค้าสัมพันธ์ (Guest Relations)',
    avatar: '👩🏻',
    role: 'Knowledge User',
    status: 'active',
  },
];
