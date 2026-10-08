import React, { useState, useRef } from 'react';
import { X, Upload, Plus, Trash2, Image as ImageIcon, Sparkles, Check, RotateCcw, AlertCircle, ExternalLink } from 'lucide-react';
import { KnowledgeItem } from '../types';
import { appendRestaurantImage, getMenuIllustration } from '../utils/menuIllustrations';
import { getItemImages, getItemImageVersion, saveItemImages, resetItemImages, SAMPLE_IMAGE_PRESETS } from '../utils/itemImageManager';

interface EditImageModalProps {
  item: KnowledgeItem;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (newImages: string[]) => void;
}

export const EditImageModal: React.FC<EditImageModalProps> = ({
  item,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [initialVersion] = useState(() => getItemImageVersion(item.id));
  const [images, setImages] = useState<string[]>(() => getItemImages(item, false));
  const [inputUrl, setInputUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAddUrl = () => {
    if (isSaving) return;
    setUrlError('');
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      setUrlError('กรุณากรอก URL รูปภาพ');
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image/')) {
      setUrlError('URL ต้องขึ้นต้นด้วย http:// หรือ https://');
      return;
    }

    setImages((prev) => appendRestaurantImage(prev, trimmed));
    setInputUrl('');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    if (isSaving) return;
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSelectPreset = (url: string, presetId: string) => {
    if (isSaving) return;
    setSelectedPresetId(presetId);
    if (!images.includes(url)) {
      setImages((prev) => [...prev, url]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSaving) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const file = files[0];

    // Check size (< 4MB recommended for localStorage data URLs)
    if (file.size > 5 * 1024 * 1024) {
      alert('ไฟล์รูปภาพมีขนาดใหญ่เกิน 5MB กรุณาเลือกรูปขนาดเล็กลง');
      setIsUploading(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setImages((prev) => appendRestaurantImage(prev, dataUrl));
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert('เกิดข้อผิดพลาดในการอ่านไฟล์รูปภาพ');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const persistImages = async (reset: boolean) => {
    if (isSaving || isUploading) return;
    setIsSaving(true);
    setSaveError('');
    try {
      if (reset) await resetItemImages(item.id, initialVersion);
      else await saveItemImages(item.id, images, initialVersion);
      onSaved(reset ? getItemImages(item, false) : images);
      onClose();
    } catch (error: any) {
      setSaveError(error.message || 'บันทึกฐานกลางไม่สำเร็จ รูปที่เลือกยังอยู่ กรุณาลองใหม่');
    } finally { setIsSaving(false); }
  };
  const handleSave = () => void persistImages(false);
  const handleResetToDefault = () => {
    if (confirm('ต้องการคืนค่ารูปเดิมจากฐานความรู้หรือไม่?')) void persistImages(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-[#E5EFE2] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {saveError && <p role="alert" className="p-4 text-red-700 bg-red-50">{saveError}</p>}
        {isSaving && <p role="status" className="p-3">กำลังบันทึกและตรวจสอบฐานกลาง…</p>}
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EAEFE9] flex items-center justify-between bg-[#FBFDFB]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2D5A43]/10 text-[#2D5A43] flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#2D5A43] bg-[#E8F3EB] px-2 py-0.5 rounded">
                  {item.id}
                </span>
                <h3 className="font-bold text-[#1B3D2F] text-base line-clamp-1">
                  จัดการรูปภาพ: {item.title}
                </h3>
              </div>
              <p className="text-xs text-[#526B5C]">
                หน้างานสามารถเพิ่มหรือเปลี่ยนรูปภาพให้ตรงกับสถานที่/เมนูจริงได้ทันที
              </p>
            </div>
          </div>
          <button
            disabled={isSaving}
              onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#F0F5F1] text-[#708477] hover:text-[#1B3D2F] flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Current Gallery View */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-[#2D5A43] uppercase tracking-wider flex items-center gap-1.5">
                <span>รูปภาพปัจจุบัน ({images.length} รูป)</span>
              </label>
              {(
                <button
                  type="button"
                  disabled={isSaving || isUploading}
                  onClick={handleResetToDefault}
                  className="text-xs text-[#916B2D] hover:text-[#7D5C26] flex items-center gap-1 font-medium transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> คืนค่ารูปเดิม
                </button>
              )}
            </div>

            {images.length === 0 ? (
              <div className="border-2 border-dashed border-[#DFE7E1] rounded-2xl p-6 text-center bg-[#FAFDFB]">
                <ImageIcon className="w-10 h-10 text-[#A3B8AC] mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#526B5C]">ยังไม่มีรูปภาพสำหรับรายการนี้</p>
                <p className="text-xs text-[#7A9384] mt-1">เลือกรูปจากตัวอย่าง หรืออัปโหลดรูปภาพใหม่ด้านล่าง</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((url, idx) => (
                  <div 
                    key={idx} 
                    className="relative group rounded-xl overflow-hidden border border-[#D5DFD8] bg-[#F4F8F5] aspect-4/3 shadow-xs"
                  >
                    <img 
                      src={url} 
                      alt={`รูปที่ ${idx + 1}`} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.visibility = 'hidden';
                        (e.target as HTMLImageElement).parentElement?.setAttribute('title', 'โหลดรูปไม่ได้ กรุณาตรวจสอบลิงก์หรือเปลี่ยนรูป');
                      }}
                    />
                    {idx === 0 && (
                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-[#1B3D2F]/85 text-white text-[10px] font-bold rounded-md backdrop-blur-xs">
                        รูปหลัก
                      </span>
                    )}
                    {getMenuIllustration(url) && <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/65 text-white text-[10px] rounded-md">ภาพประกอบเมนู</span>}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 w-7 h-7 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center shadow-md transition-transform transform scale-90 group-hover:scale-100"
                      title="ลบรูปนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Image Controls */}
          <div className="border border-[#E2ECE5] rounded-2xl p-4 bg-[#FBFDFB]">
            <div className="flex flex-wrap border-b border-[#E2ECE5] pb-2 mb-4 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'presets'
                    ? 'bg-[#2D5A43] text-white shadow-xs'
                    : 'text-[#526B5C] hover:bg-[#EEF5EC]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> รูปตัวอย่าง (ไม่ใช่ภาพสถานที่จริง)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-[#2D5A43] text-white shadow-xs'
                    : 'text-[#526B5C] hover:bg-[#EEF5EC]'
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> อัปโหลดจากมือถือ/คอมฯ
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('url')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'url'
                    ? 'bg-[#2D5A43] text-white shadow-xs'
                    : 'text-[#526B5C] hover:bg-[#EEF5EC]'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> ใส่ลิงก์ URL รูป
              </button>
            </div>

            {/* Tab: Presets */}
            {activeTab === 'presets' && (
              <div className="space-y-2">
                <p className="text-xs text-[#526B5C] mb-2">
                  คลิกเพื่อเลือกภาพคุณภาพสูงของบ้านโฮมที่ต้องการเพิ่ม:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {SAMPLE_IMAGE_PRESETS.map((preset) => {
                    const isAdded = images.includes(preset.url);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.url, preset.id)}
                        className={`text-left p-1.5 rounded-xl border transition-all relative overflow-hidden group ${
                          isAdded 
                            ? 'border-[#2D5A43] bg-[#EAF5ED] ring-1 ring-[#2D5A43]'
                            : 'border-[#DFE7E1] bg-white hover:border-[#2D5A43]'
                        }`}
                      >
                        <div className="relative aspect-16/10 rounded-lg overflow-hidden mb-1.5">
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            referrerPolicy="no-referrer"
                          />
                          {isAdded && (
                            <div className="absolute inset-0 bg-[#2D5A43]/60 flex items-center justify-center text-white">
                              <Check className="w-5 h-5 stroke-3" />
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] font-bold text-[#1B3D2F] line-clamp-1">
                          {preset.label}
                        </p>
                        <p className="text-[9px] text-[#708477] line-clamp-1">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab: Upload File */}
            {activeTab === 'upload' && (
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#2D5A43]/40 hover:border-[#2D5A43] bg-[#F4F8F5] hover:bg-[#EAF3EC] rounded-2xl p-6 text-center cursor-pointer transition-all"
                >
                  <Upload className="w-8 h-8 text-[#2D5A43] mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#1B3D2F]">
                    {isUploading ? 'กำลังอัปโหลด...' : 'แตะเพื่อเลือกรูป หรือถ่ายรูปจากมือถือ'}
                  </p>
                  <p className="text-xs text-[#526B5C] mt-1">
                    รองรับไฟล์ JPG, PNG, WEBP (บันทึกลงในระบบเพื่อใช้งานได้ทันที)
                  </p>
                </div>
              </div>
            )}

            {/* Tab: Direct URL */}
            {activeTab === 'url' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1B3D2F] mb-1">
                    วางลิงก์รูปภาพ (Image URL)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={inputUrl}
                      onChange={(e) => {
                        setInputUrl(e.target.value);
                        setUrlError('');
                      }}
                      placeholder="https://example.com/photo.jpg"
                      className="flex-1 px-3.5 py-2 text-xs border border-[#C5D6C9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A43] bg-white text-[#1B3D2F]"
                    />
                    <button
                      type="button"
                      onClick={handleAddUrl}
                      className="px-4 py-2 bg-[#2D5A43] hover:bg-[#1B3D2F] text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                    >
                      เพิ่มรูป
                    </button>
                  </div>
                  {urlError && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {urlError}
                    </p>
                  )}
                  <p className="text-[11px] text-[#7A9384] mt-1.5">
                    สามารถนำลิงก์รูปภาพจาก Google Drive (Direct link), Google Photos, Cloudinary หรือเว็บไซต์มาวางได้
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-[#EAEFE9] bg-[#FBFDFB] flex items-center justify-between">
          <button
            type="button"
            disabled={isSaving}
              onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#526B5C] hover:text-[#1B3D2F] transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={isSaving || isUploading}
            onClick={handleSave}
            className="px-6 py-2.5 bg-[#2D5A43] hover:bg-[#1B3D2F] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> บันทึกรูปภาพ
          </button>
        </div>
      </div>
    </div>
  );
};

