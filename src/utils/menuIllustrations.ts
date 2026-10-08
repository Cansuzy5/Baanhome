import type { KnowledgeItem } from '../types';

export interface MenuIllustration {
  name: string; pattern: string; url: string; source: string;
  author: string; license: string; licenseUrl: string;
}
// Curated dish photos only. No network image search, AI calls, or database edits.
export const MENU_ILLUSTRATIONS: MenuIllustration[] = [
  {
    "name": "ต้มยำกุ้ง",
    "pattern": "ต้มยำกุ้ง(?:แม่น้ำ)?",
    "url": "/menu-illustrations/1.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Tom_yum.jpg",
    "author": "OpenCage",
    "license": "CC BY-SA 2.5",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.5/"
  },
  {
    "name": "ผัดไทย",
    "pattern": "ผัดไทย(?!.*(?:หมู|ไก่|เนื้อ))",
    "url": "/menu-illustrations/2.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Pad_thai.jpg",
    "author": "BenFrantzDale",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/"
  },
  {
    "name": "ส้มตำไทย",
    "pattern": "ส้มตำ(?:ไทย)?(?!\\s*(?:ปู|ปลาร้า|ลาว|แตง|ถั่ว))",
    "url": "/menu-illustrations/3.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Som_tam.jpg",
    "author": "lazy fri13th",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0/"
  },
  {
    "name": "ข้าวผัดหมู",
    "pattern": "ข้าวผัดหมู",
    "url": "/menu-illustrations/4.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Khao_Phat_Mu.jpg",
    "author": "Mattes",
    "license": "Public domain",
    "licenseUrl": ""
  },
  {
    "name": "ไก่ย่าง",
    "pattern": "ไก่ย่าง",
    "url": "/menu-illustrations/5.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Kai_yang.JPG",
    "author": "Takeaway",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/"
  },
  {
    "name": "ยำวุ้นเส้น",
    "pattern": "ยำวุ้นเส้น(?!.*(?:ทะเล|กุ้งสด|รวมมิตร))",
    "url": "/menu-illustrations/6.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Yam_wunsen.jpg",
    "author": "Takeaway",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/"
  },
  {
    "name": "กุ้งเผา",
    "pattern": "กุ้ง(?:แม่น้ำ|ก้ามกราม)?เผา",
    "url": "/menu-illustrations/7.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Kung_kam_kram.jpg",
    "author": "Takeaway",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/"
  },
  {
    "name": "เสือร้องไห้",
    "pattern": "เสือร้องไห้",
    "url": "/menu-illustrations/8.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Suea_rong_hai.jpg",
    "author": "Takeaway",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/"
  },
  {
    "name": "ทอดมันกุ้ง",
    "pattern": "ทอดมันกุ้ง",
    "url": "/menu-illustrations/9.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Thot_man_kung.jpg",
    "author": "chomjong",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0/"
  },
  {
    "name": "คอหมูย่าง",
    "pattern": "คอหมูย่าง",
    "url": "/menu-illustrations/10.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Kho_mu_yang_kratha_ron.jpg",
    "author": "Takeaway",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/"
  },
  {
    "name": "กะเพราหมูไข่ดาว",
    "pattern": "(?:กะเพรา|กระเพรา)หมู(?:สับ)?(?:ไข่ดาว)?",
    "url": "/menu-illustrations/11.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Kraphao_mu_khai_dao.jpg",
    "author": "Takeaway",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/"
  },
  {
    "name": "ลาบหมู",
    "pattern": "ลาบหมู",
    "url": "/menu-illustrations/12.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Lap_mu_isan.JPG",
    "author": "Takeaway",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/"
  },
  {
    "name": "ผัดผักบุ้งไฟแดง",
    "pattern": "(?:ผัด)?ผักบุ้งไฟแดง",
    "url": "/menu-illustrations/13.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Pak_boong_fai_daeng.jpg",
    "author": "Takeaway",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/"
  },
  {
    "name": "คะน้าน้ำมันหอย",
    "pattern": "(?:ผัด)?คะน้าน้ำมันหอย",
    "url": "/menu-illustrations/14.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Phak_kana_nam_man_hoi.jpg",
    "author": "Takeaway",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/"
  },
  {
    "name": "ซี่โครงหมูทอด",
    "pattern": "ซี่โครงหมูทอด",
    "url": "/menu-illustrations/15.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Si_khrong_mu_thot.JPG",
    "author": "Takeaway",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/"
  },
  {
    "name": "ปลานิลนึ่งมะนาว",
    "pattern": "ปลานิลนึ่งมะนาว",
    "url": "/menu-illustrations/16.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Thai_steamed_fish_with_lime_juice-2.jpg",
    "author": "Mattes; derivative: an-d",
    "license": "Public domain",
    "licenseUrl": ""
  },
  {
    "name": "ทอดมันปลา",
    "pattern": "ทอดมันปลา",
    "url": "/menu-illustrations/17.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Thanin_market_tod_man_pla.jpg",
    "author": "Takeaway",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/"
  },
  {
    "name": "ยำทะเล",
    "pattern": "ยำทะเล",
    "url": "/menu-illustrations/18.jpg",
    "source": "https://commons.wikimedia.org/wiki/File:Yam_thale.jpg",
    "author": "Takeaway",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/"
  }
];

export function getMenuIllustration(url: string): MenuIllustration | undefined {
  return MENU_ILLUSTRATIONS.find(photo => photo.url === url);
}
export function getMenuIllustrations(item: Pick<KnowledgeItem, 'title' | 'category'>): MenuIllustration[] {
  if (item.category !== 'restaurant') return [];
  // Match the actual menu title, never incidental dishes in descriptions.
  const title = (item.title || '').normalize('NFC').replace(/\s+/g, ' ');
  return MENU_ILLUSTRATIONS.filter(photo => new RegExp(photo.pattern, 'i').test(title)).slice(0, 3);
}
export function appendRestaurantImage(previous: string[], url: string): string[] {
  // The first actual upload replaces starter illustrations, keeps actual photos.
  const base = getMenuIllustration(url) ? previous : previous.filter(photo => !getMenuIllustration(photo));
  return [...base, url];
}
