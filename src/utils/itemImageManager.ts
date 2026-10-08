import { SharedContentClient, watchSharedContent } from './sharedContentClient';
import { KnowledgeCategory, KnowledgeItem } from '../types';

const STORAGE_KEY = 'baan_home_custom_item_images_v1';

// Curated high quality presets matching Baan Home Resort & Dining
export interface ImagePreset {
  id: string;
  label: string;
  category: string;
  url: string;
  description: string;
}

export const SAMPLE_IMAGE_PRESETS: ImagePreset[] = [
  {
    id: 'preset-pool-villa-1',
    label: 'พูลวิลล่าส่วนตัวพร้อมสระว่ายน้ำ',
    category: 'pool-villa',
    url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
    description: 'วิลล่าหรูหลังใหญ่ สระว่ายน้ำส่วนตัวท่ามกลางสวนร่มรื่น',
  },
  {
    id: 'preset-pool-villa-2',
    label: 'ห้องนอนพูลวิลล่าและระเบียงสระ',
    category: 'pool-villa',
    url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    description: 'ห้องพักเตียงคิงไซส์มองเห็นวิวสระว่ายน้ำ',
  },
  {
    id: 'preset-resort-deluxe',
    label: 'ห้องพักรีสอร์ท Deluxe Room',
    category: 'resort-knowledge',
    url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    description: 'ห้องพักอบอุ่น สะอาด เตียงนุ่ม สิ่งอำนวยความสะดวกครบครัน',
  },
  {
    id: 'preset-resort-pool',
    label: 'สระว่ายน้ำส่วนกลางและสวนพักผ่อน',
    category: 'resort-knowledge',
    url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
    description: 'บรรยากาศสระน้ำกลางแจ้งและแมกไม้ธรรมชาติ',
  },
  {
    id: 'preset-dining-garden',
    label: 'สวนอาหารบ้านโฮม บรรยากาศธรรมชาติ',
    category: 'restaurant',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    description: 'โซนที่นั่งโปร่งสบาย ร่มรื่นด้วยต้นไม้ เหมาะสำหรับครอบครัวและสังสรรค์',
  },
  {
    id: 'preset-dining-food',
    label: 'เมนูอาหารอีสานและอาหารไทยรสเด็ด',
    category: 'restaurant',
    url: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80',
    description: 'ส้มตำ ปลาเผา ไก่ย่าง และเมนูพื้นบ้านคัดสรรวัตถุดิบคุณภาพ',
  },
  {
    id: 'preset-mice-hall',
    label: 'ห้องประชุมสัมมนาและจัดเลี้ยง Mini MICE',
    category: 'mini-mice',
    url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
    description: 'รองรับคณะสัมมนา 20-80 ท่าน พร้อมโปรเจกเตอร์และเครื่องเสียง',
  },
  {
    id: 'preset-mice-coffee-break',
    label: 'เซ็ตคอฟฟี่เบรคและอาหารว่างจัดเลี้ยง',
    category: 'mini-mice',
    url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
    description: 'บริการจัดเบรคเครื่องดื่ม ชากาแฟ และขนมไทยร่วมสมัย',
  },
  {
    id: 'preset-entrance-profile',
    label: 'ทางเข้าและบรรยากาศรีสอร์ทบ้านโฮม',
    category: 'business-profile',
    url: 'https://images.unsplash.com/photo-1542314831-c6a4d142104d?auto=format&fit=crop&w=1200&q=80',
    description: 'ซุ้มต้อนรับประตูสู่กาฬสินธุ์ บรรยากาศเงียบสงบเป็นส่วนตัว',
  },
  {
    id: 'preset-location-map',
    label: 'แผนที่การเดินทางและพิกัด GPS',
    category: 'business-profile',
    url: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80',
    description: 'ตั้งอยู่ที่ อ.ยางตลาด จ.กาฬสินธุ์ เดินทางสะดวกติดถนนสายหลัก',
  },
  {
    id: 'preset-pet-friendly',
    label: 'พื้นที่ Pet-Friendly สัตว์เลี้ยงเข้าพักได้',
    category: 'resort-knowledge',
    url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1200&q=80',
    description: 'สนามหญ้ากว้างขวางสำหรับน้องหมาน้องแมววิ่งเล่นอย่างปลอดภัย',
  },
  {
    id: 'preset-promo-package',
    label: 'แพ็กเกจห้องพักพร้อมอาหารเช้าและส่วนลด',
    category: 'promotion-package',
    url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    description: 'โปรโมชั่นพิเศษประจำเดือนและสิทธิพิเศษองค์กร',
  },
  {
    id: 'preset-front-desk',
    label: 'เคาน์เตอร์ต้อนรับและเช็คอิน Front Office',
    category: 'reservation',
    url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    description: 'เจ้าหน้าที่พร้อมต้อนรับและอำนวยความสะดวกตลอดเวลาทำการ',
  },
];

// Fallback category images
const CATEGORY_DEFAULT_IMAGES: Record<KnowledgeCategory, string> = {
  'pool-villa': 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
  'resort-knowledge': 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
  'restaurant': 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
  'mini-mice': 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
  'business-profile': 'https://images.unsplash.com/photo-1542314831-c6a4d142104d?auto=format&fit=crop&w=1200&q=80',
  'promotion-package': 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
  'reservation': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  'customer-service': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80',
  'sop-operation': 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80',
  'faq-problems': 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80',
  'kc-corporation': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
  'employee-welfare': 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
  'competitor-battlecard': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
  'quotation-policy': 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80',
};

// Item-specific defaults for iconic items
const ITEM_SPECIFIC_IMAGES: Record<string, string[]> = {
  'BH-001': [
    'https://images.unsplash.com/photo-1542314831-c6a4d142104d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
  ],
  'BH-002': [
    'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80',
  ],
  'BH-003': [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  ],
  'kb-payment-bank': [
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80',
  ],
  'kb-location-map': [
    'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80',
  ],
  'kb-pet-policy': [
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1200&q=80',
  ],
  'kb-checkin-checkout': [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
  ],
};

let imageMemory: Record<string, string[]> | null = null;
const imageClient = new SharedContentClient('/api/sync/custom-images');
function getCustomImagesMap(): Record<string, string[]> {
  try {
    if (imageMemory) return imageMemory;
    const raw = localStorage.getItem('baan_home_shared_images_v2') || localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load custom item images from localStorage', e);
  }
  return {};
}

function setCustomImagesMap(map: Record<string, string[]>): void {
  imageMemory = map;
  // The original local-only cache is deliberately retained for recovery.
  try { localStorage.setItem('baan_home_shared_images_v2', JSON.stringify(map)); } catch {}
  window.dispatchEvent(new CustomEvent('baan_home_images_updated'));
}
export function syncCustomImagesWithServer() {
  let active = true;
  const stop = watchSharedContent(async () => {
    const { values, legacy } = await imageClient.read();
    if (!active) return;
    const map = { ...(legacy || {}) };
    for (const [id, value] of Object.entries(values)) {
      if (value === null) delete map[id];
      else map[id] = value;
    }
    // Keep local-only images visible until that item is explicitly saved/reset.
    let original: Record<string, string[]> = {};
    try { original = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch {}
    for (const [id, value] of Object.entries(original)) {
      if (!(id in values) && !(id in map)) map[id] = value;
    }
    setCustomImagesMap(map);
  });
  return () => { active = false; stop(); };
}

/**
 * Returns the images associated with a KnowledgeItem.
 * Priority order:
 * 1. User/Staff customized images stored in localStorage
 * 2. Item's explicit images array or imageUrl
 * 3. Specific curated item default images
 * 4. Default image for the category
 */
export function getItemImages(item: KnowledgeItem): string[] {
  if (!item) return [];

  // 1. Check local storage overrides
  const customMap = getCustomImagesMap();
  if (Array.isArray(customMap[item.id])) {
    return customMap[item.id];
  }

  // 2. Check item explicit images
  if (item.images && Array.isArray(item.images) && item.images.length > 0) {
    return item.images;
  }
  if (item.imageUrl) {
    return [item.imageUrl];
  }

  // 3. Specific curated item default
  if (ITEM_SPECIFIC_IMAGES[item.id]) {
    return ITEM_SPECIFIC_IMAGES[item.id];
  }

  // Check if keywords or title suggest specific visual
  const text = `${item.title} ${item.keywords?.join(' ') || ''}`.toLowerCase();
  if (text.includes('พูลวิลล่า') || text.includes('pool villa') || text.includes('สระว่ายน้ำ')) {
    return [
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    ];
  }
  if (text.includes('อาหาร') || text.includes('เมนู') || text.includes('ส้มตำ') || text.includes('ปลาเผา')) {
    return [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80',
    ];
  }
  if (text.includes('สัมมนา') || text.includes('ประชุม') || text.includes('mice') || text.includes('จัดเลี้ยง')) {
    return [
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
    ];
  }
  if (text.includes('สัตว์เลี้ยง') || /หมา(?![ยกดง])/i.test(text) || text.includes('สุนัข') || text.includes('แมว') || text.includes('pet-friendly') || text.includes('pet policy')) {
    return [
      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1200&q=80',
    ];
  }
  if (text.includes('แผนที่') || text.includes('location') || text.includes('พิกัด') || text.includes('ทางไป')) {
    return [
      'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80',
    ];
  }

  // 4. Default category image
  const catImg = CATEGORY_DEFAULT_IMAGES[item.category];
  return catImg ? [catImg] : [];
}

/**
 * Saves or updates custom images for a given item.
 */
export function getItemImageVersion(itemId: string) { return imageClient.version(itemId); }
export async function saveItemImages(itemId: string, images: string[], version?: string | null): Promise<void> {
  await imageClient.save(itemId, images.filter(url => typeof url === 'string' && url.trim().length > 0), version);
  const map = getCustomImagesMap();
  map[itemId] = images.filter((url) => typeof url === 'string' && url.trim().length > 0);
  setCustomImagesMap(map);
}

/**
 * Resets custom images back to original default.
 */
export async function resetItemImages(itemId: string, version?: string | null): Promise<void> {
  await imageClient.save(itemId, null, version);
  const map = getCustomImagesMap();
  delete map[itemId];
  setCustomImagesMap(map);
}

