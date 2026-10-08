import React, { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import type { KnowledgeItem } from '../types';
import { getItemImages } from '../utils/itemImageManager';
import { getMenuIllustration } from '../utils/menuIllustrations';
import { EditImageModal } from './EditImageModal';
import { ImageLightboxModal } from './ImageLightboxModal';
export function KnowledgeMedia({ item }: { item: KnowledgeItem; key?: string }) {
  const [images, setImages] = useState(() => getItemImages(item, false));
  const [edit, setEdit] = useState(false);
  const [index, setIndex] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setImages(getItemImages(item, false)); update();
    window.addEventListener('baan_home_images_updated', update);
    return () => window.removeEventListener('baan_home_images_updated', update);
  }, [item]);
  return <div data-knowledge-id={item.id} className="mt-3">
    {images.length > 0 && <div className="flex gap-3 overflow-x-auto pb-2">{images.map((url, i) => {
      const credit = getMenuIllustration(url);
      return <figure key={`${url}-${i}`} className="w-40 shrink-0"><button aria-label={`ดูรูป ${credit?.name || item.title}`} onClick={() => setIndex(i)} className="block w-full"><img loading="lazy" src={url} alt={credit?.name || item.title} className="w-full h-28 object-cover rounded-xl border border-[#e1e6dc]" /></button><figcaption className="text-[10px] text-[#788477] mt-1">{credit ? `ภาพประกอบเมนู · ${credit.name}` : 'รูปจากฐานความรู้'}</figcaption></figure>;
    })}</div>}
    <button onClick={() => setEdit(true)} className="inline-flex gap-1 items-center text-xs text-[#597662] py-1"><Camera size={13} />{images.length ? 'แก้ไขรูปภาพ' : 'เพิ่มรูปภาพ'}</button>
    {images.some(getMenuIllustration) && <details className="text-[10px] text-[#788477] mt-1"><summary className="cursor-pointer">เครดิตภาพประกอบ</summary>{images.map(getMenuIllustration).filter(Boolean).map(c => <p key={c!.url}><a href={c!.source} target="_blank" rel="noreferrer">{c!.name} · {c!.author}</a> · <a href={c!.licenseUrl || c!.source} target="_blank" rel="noreferrer">{c!.license}</a></p>)}</details>}
    {edit && <EditImageModal item={item} isOpen onSaved={setImages} onClose={() => setEdit(false)} />}
    {index !== null && <ImageLightboxModal images={images} initialIndex={index} isOpen onClose={() => setIndex(null)} title={item.title} />}
  </div>;
}
