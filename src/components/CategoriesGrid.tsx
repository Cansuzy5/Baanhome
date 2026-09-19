import React, { useState, useMemo } from 'react';
import {
  Building2,
  UtensilsCrossed,
  Hotel,
  Waves,
  Users,
  Tag,
  HeartHandshake,
  CalendarCheck,
  ClipboardList,
  HelpCircle,
  Briefcase,
  Sparkles,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Search,
  CheckCircle2,
  FileText,
  Layers,
  Sparkle,
  Compass,
  FileSpreadsheet,
  Target,
} from 'lucide-react';
import { CategoryMeta, KnowledgeCategory } from '../types';
import { KNOWLEDGE_CATEGORIES } from '../data/categories';

interface CategoriesGridProps {
  selectedCategory: KnowledgeCategory | 'all';
  onSelectCategory: (cat: KnowledgeCategory | 'all') => void;
  onOpenDocModal?: (category: CategoryMeta) => void;
}

type ClusterFilter = 'all' | 'stay' | 'dining' | 'sales' | 'ops' | 'hr';

const getCategoryTheme = (id: string) => {
  switch (id) {
    case 'restaurant':
      return {
        bg: 'bg-[#FAF5EF]',
        border: 'border-[#EADBCA]',
        activeBorder: 'border-[#A35921]',
        iconBg: 'bg-[#FBE8D8]',
        iconColor: 'text-[#A35921]',
        tagBg: 'bg-[#F6E3D0]',
        tagColor: 'text-[#873F0D]',
        domain: 'อาหาร & F&B',
      };
    case 'pool-villa':
    case 'resort-knowledge':
      return {
        bg: 'bg-[#F2F8F7]',
        border: 'border-[#D1E8E4]',
        activeBorder: 'border-[#1E6B65]',
        iconBg: 'bg-[#DDF2EF]',
        iconColor: 'text-[#1B605B]',
        tagBg: 'bg-[#CFEDE8]',
        tagColor: 'text-[#124B47]',
        domain: 'ที่พัก & สระว่ายน้ำ',
      };
    case 'mini-mice':
    case 'competitor-battlecard':
    case 'quotation-policy':
      return {
        bg: 'bg-[#F8F4FA]',
        border: 'border-[#E5D7EC]',
        activeBorder: 'border-[#693282]',
        iconBg: 'bg-[#EFE3F5]',
        iconColor: 'text-[#693282]',
        tagBg: 'bg-[#E7D2F0]',
        tagColor: 'text-[#502266]',
        domain: 'MICE & การขาย B2B',
      };
    case 'promotion-package':
      return {
        bg: 'bg-[#FDF8ED]',
        border: 'border-[#F2E0B5]',
        activeBorder: 'border-[#9E6D0E]',
        iconBg: 'bg-[#FCEECA]',
        iconColor: 'text-[#9E6D0E]',
        tagBg: 'bg-[#F9E5AF]',
        tagColor: 'text-[#7D5305]',
        domain: 'โปรโมชั่น & แพ็กเกจ',
      };
    case 'customer-service':
    case 'faq-problems':
      return {
        bg: 'bg-[#FDF5F5]',
        border: 'border-[#F4D6D6]',
        activeBorder: 'border-[#A83838]',
        iconBg: 'bg-[#FCE6E6]',
        iconColor: 'text-[#A83838]',
        tagBg: 'bg-[#FAD0D0]',
        tagColor: 'text-[#872222]',
        domain: 'บริการ & รับเรื่องร้องเรียน',
      };
    case 'reservation':
    case 'sop-operation':
      return {
        bg: 'bg-[#F3F8F4]',
        border: 'border-[#D5E7D7]',
        activeBorder: 'border-[#22633E]',
        iconBg: 'bg-[#E1F0E4]',
        iconColor: 'text-[#22633E]',
        tagBg: 'bg-[#CEE7D3]',
        tagColor: 'text-[#174B2E]',
        domain: 'การจอง & ปฏิบัติการ SOP',
      };
    default:
      return {
        bg: 'bg-[#F7F6F3]',
        border: 'border-[#E2DDD3]',
        activeBorder: 'border-[#2E4336]',
        iconBg: 'bg-[#E9E5DB]',
        iconColor: 'text-[#2E4336]',
        tagBg: 'bg-[#DDD7C9]',
        tagColor: 'text-[#23352A]',
        domain: 'องค์กร & พนักงาน',
      };
  }
};

const getCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case 'Building2':
      return <Building2 className="w-5 h-5" />;
    case 'UtensilsCrossed':
      return <UtensilsCrossed className="w-5 h-5" />;
    case 'Hotel':
      return <Hotel className="w-5 h-5" />;
    case 'Waves':
      return <Waves className="w-5 h-5" />;
    case 'Users':
      return <Users className="w-5 h-5" />;
    case 'Tag':
      return <Tag className="w-5 h-5" />;
    case 'HeartHandshake':
      return <HeartHandshake className="w-5 h-5" />;
    case 'CalendarCheck':
      return <CalendarCheck className="w-5 h-5" />;
    case 'ClipboardList':
      return <ClipboardList className="w-5 h-5" />;
    case 'HelpCircle':
      return <HelpCircle className="w-5 h-5" />;
    case 'Briefcase':
      return <Briefcase className="w-5 h-5" />;
    case 'Sparkles':
      return <Sparkles className="w-5 h-5" />;
    case 'Target':
      return <Target className="w-5 h-5" />;
    case 'FileText':
      return <FileText className="w-5 h-5" />;
    default:
      return <BookOpen className="w-5 h-5" />;
  }
};

export const CategoriesGrid: React.FC<CategoriesGridProps> = ({
  selectedCategory,
  onSelectCategory,
  onOpenDocModal,
}) => {
  const [clusterFilter, setClusterFilter] = useState<ClusterFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter categories by cluster and search term
  const filteredCategories = useMemo(() => {
    return KNOWLEDGE_CATEGORIES.filter((cat) => {
      // Cluster match
      if (clusterFilter === 'stay' && !['resort-knowledge', 'pool-villa'].includes(cat.id)) {
        return false;
      }
      if (clusterFilter === 'dining' && cat.id !== 'restaurant') {
        return false;
      }
      if (
        clusterFilter === 'sales' &&
        !['mini-mice', 'promotion-package', 'competitor-battlecard', 'quotation-policy'].includes(cat.id)
      ) {
        return false;
      }
      if (
        clusterFilter === 'ops' &&
        !['customer-service', 'reservation', 'sop-operation', 'faq-problems'].includes(cat.id)
      ) {
        return false;
      }
      if (
        clusterFilter === 'hr' &&
        !['business-profile', 'kc-corporation', 'employee-welfare'].includes(cat.id)
      ) {
        return false;
      }

      // Search match
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesNameTh = cat.nameTh.toLowerCase().includes(q);
        const matchesNameEn = cat.nameEn.toLowerCase().includes(q);
        const matchesDesc = cat.description.toLowerCase().includes(q);
        const matchesDoc = cat.googleDocName?.toLowerCase().includes(q) || false;
        return matchesNameTh || matchesNameEn || matchesDesc || matchesDoc;
      }

      return true;
    });
  }, [clusterFilter, searchTerm]);

  return (
    <section className="my-6 space-y-5">
      {/* Control Bar: Cluster Tabs & Real-time Filter */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E0D5] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EEF5EC] text-[#1B3D2F] flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#1B3D2F]">
                คลังความรู้มาตรฐาน 14 หมวดหมู่ (Standardized Knowledge Repository)
              </h3>
              <p className="text-xs text-[#6F8274]">
                ครอบคลุมข้อมูลบริการ พูลวิลล่า กฎระเบียบ SOP และกลยุทธ์การขายของบ้านโฮม
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#889E90]" />
              <input
                id="search-knowledge-categories"
                type="text"
                placeholder="ค้นหาหมวด, เมนู, วิลล่า, SOP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#D5D0C5] bg-[#FAF8F5] focus:outline-none focus:border-[#1B3D2F]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {selectedCategory !== 'all' && (
              <button
                onClick={() => onSelectCategory('all')}
                className="text-xs text-[#24543C] font-bold px-3 py-1.5 rounded-xl bg-[#EEF5EC] hover:bg-[#DDEEE0] transition-colors cursor-pointer shrink-0"
              >
                ล้างการเลือก
              </button>
            )}
          </div>
        </div>

        {/* Cluster Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          {[
            { id: 'all', label: 'ทั้งหมด (14 หมวด)' },
            { id: 'stay', label: '🏡 ห้องพัก & วิลล่า' },
            { id: 'dining', label: '🍽️ อาหาร & F&B' },
            { id: 'sales', label: '💼 MICE & การขาย' },
            { id: 'ops', label: '📋 บริการ & SOP' },
            { id: 'hr', label: '🏢 องค์กร & สวัสดิการ' },
          ].map((tab) => {
            const isActive = clusterFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setClusterFilter(tab.id as ClusterFilter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1B3D2F] text-white shadow-xs'
                    : 'bg-[#FAF8F5] hover:bg-[#F2EFE8] text-[#5A6E60] border border-[#E5E0D5]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Knowledge Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const theme = getCategoryTheme(cat.id);

          return (
            <div
              key={cat.id}
              className={`relative rounded-2xl p-5 transition-all duration-200 border text-left flex flex-col justify-between group shadow-xs hover:shadow-md ${
                isSelected
                  ? 'bg-white ring-2 ring-[#1B3D2F] border-[#1B3D2F] shadow-sm'
                  : `${theme.bg} ${theme.border} hover:border-[#1B3D2F]/50`
              }`}
            >
              <div>
                {/* Header: Icon, Domain Badge, and Doc Count */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs ${theme.iconBg} ${theme.iconColor}`}
                    >
                      {getCategoryIcon(cat.icon)}
                    </div>
                    <div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${theme.tagBg} ${theme.tagColor}`}
                      >
                        {theme.domain}
                      </span>
                      <div className="text-[11px] font-medium text-[#7A8E80] mt-0.5">
                        {cat.nameEn}
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-white text-[#2C3E33] border border-[#D5D0C5] shadow-2xs shrink-0">
                    {cat.docCount} Docs
                  </span>
                </div>

                {/* Title Thai */}
                <h4 className="text-sm font-bold text-[#1B3D2F] leading-snug group-hover:text-[#23583C] transition-colors mb-1.5">
                  {cat.nameTh}
                </h4>

                {/* Description */}
                <p className="text-xs text-[#5A6E60] leading-relaxed line-clamp-3 mb-3">
                  {cat.description}
                </p>

                {/* Document Reference Pill */}
                {cat.googleDocName && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#4A5E50] font-mono bg-white/80 px-2.5 py-1 rounded-lg border border-[#E5E0D5] truncate mb-3">
                    {cat.googleDocName.endsWith('.xlsx') ? (
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#1E7145] shrink-0" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-[#2B7DE9] shrink-0" />
                    )}
                    <span className="truncate">{cat.googleDocName}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-2 pt-3 border-t border-[#E5E0D5]/70 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1B3D2F] text-white shadow-xs'
                      : 'bg-white hover:bg-[#1B3D2F] text-[#1B3D2F] hover:text-white border border-[#D5D0C5] hover:border-[#1B3D2F]'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isSelected ? 'กำลังเลือกหมวดนี้' : 'ค้นหาในหมวดนี้'}</span>
                </button>

                {onOpenDocModal && (
                  <button
                    type="button"
                    onClick={() => onOpenDocModal(cat)}
                    className="p-2 rounded-xl text-xs font-semibold text-[#5A6E60] hover:text-[#1B3D2F] bg-white hover:bg-[#F2EFE8] border border-[#D5D0C5] transition-all cursor-pointer shrink-0"
                    title="เปิดดูโครงสร้างเอกสารและหัวข้อย่อย"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="p-10 text-center bg-white rounded-2xl border border-[#E5E0D5] text-[#6F8274]">
          <BookOpen className="w-8 h-8 mx-auto mb-2 text-[#A5B8AC]" />
          <p className="font-bold text-sm text-[#1B3D2F]">ไม่พบหมวดหมู่ที่ตรงกับคำค้นหา "{searchTerm}"</p>
          <p className="text-xs mt-1">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "ทั้งหมด"</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setClusterFilter('all');
            }}
            className="mt-3 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#1B3D2F] bg-[#EEF5EC] hover:bg-[#DDEEE0] transition-colors cursor-pointer"
          >
            แสดงทุกหมวดหมู่
          </button>
        </div>
      )}
    </section>
  );
};
