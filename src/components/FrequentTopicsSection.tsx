import React, { useState } from 'react';
import {
  Calendar,
  PawPrint,
  Waves,
  FileText,
  Users,
  Tag,
  Clock,
  ArrowRight,
  Flame,
  ChevronRight,
  CreditCard,
  MapPin,
  Target,
  Sparkles,
} from 'lucide-react';
import { FREQUENT_TOPICS } from '../data/frequentQuestions';

interface FrequentTopicsSectionProps {
  onSelectTopic: (query: string) => void;
  onViewAll?: () => void;
}

const getTopicIcon = (iconName: string) => {
  switch (iconName) {
    case 'CreditCard':
      return <CreditCard className="w-5 h-5 text-[#916B2D]" />;
    case 'MapPin':
      return <MapPin className="w-5 h-5 text-[#2D5A43]" />;
    case 'Clock':
    case 'Calendar':
      return <Calendar className="w-5 h-5 text-[#2D5A43]" />;
    case 'PawPrint':
      return <PawPrint className="w-5 h-5 text-[#916B2D]" />;
    case 'Waves':
      return <Waves className="w-5 h-5 text-[#2C6378]" />;
    case 'Receipt':
    case 'FileText':
      return <FileText className="w-5 h-5 text-[#916B2D]" />;
    case 'Users':
      return <Users className="w-5 h-5 text-[#2D5A43]" />;
    case 'Tag':
      return <Tag className="w-5 h-5 text-[#916B2D]" />;
    case 'Target':
      return <Target className="w-5 h-5 text-[#A62F2F]" />;
    case 'Sparkles':
      return <Sparkles className="w-5 h-5 text-[#B57C1E]" />;
    default:
      return <Calendar className="w-5 h-5 text-[#2D5A43]" />;
  }
};

const getCategoryTheme = (category: string) => {
  switch (category) {
    case 'Pet-Friendly':
      return 'bg-[#FDF3E5] text-[#8E5E1B] border-[#F2DEBF]';
    case 'พูลวิลล่า':
      return 'bg-[#E7F3F7] text-[#24637A] border-[#CEE4EC]';
    case 'การจอง':
    case 'การเข้าพัก':
      return 'bg-[#EEF5EC] text-[#28573D] border-[#D1E6CF]';
    case 'สัมมนา & กรุ๊ป':
      return 'bg-[#EEF5EC] text-[#28573D] border-[#D1E6CF]';
    case 'โปรโมชั่น':
    case 'โปรโมชั่น 2026':
      return 'bg-[#FDF1E6] text-[#A25316] border-[#F6DAC2]';
    case 'Battlecard':
      return 'bg-[#FFEED7] text-[#A65B0A] border-[#F5D7A9]';
    default:
      return 'bg-[#EEF5EC] text-[#28573D] border-[#D1E6CF]';
  }
};

export const FrequentTopicsSection: React.FC<FrequentTopicsSectionProps> = ({
  onSelectTopic,
}) => {
  const [showAll, setShowAll] = useState(false);
  const displayedTopics = showAll ? FREQUENT_TOPICS : FREQUENT_TOPICS.slice(0, 6);

  return (
    <section className="my-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FDF0DE] text-[#C27D23] flex items-center justify-center shrink-0 border border-[#F6E1C4]">
            <Flame className="w-5 h-5 fill-[#C27D23]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1B3225] font-heading tracking-tight">
              หัวข้อที่พบบ่อย (Frequent Inquiries)
            </h3>
            <p className="text-xs text-[#6C7E72]">
              คำถามที่ลูกค้าสอบถามบ่อยที่สุด ค้นหาคำตอบได้อย่างรวดเร็ว
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF8F3] hover:bg-[#F2EDE2] text-[#2D5A43] text-xs font-semibold border border-[#E5DFD1] transition-all cursor-pointer shadow-2xs"
        >
          <span>{showAll ? 'แสดง 6 หัวข้อ' : `ดูทั้งหมด ${FREQUENT_TOPICS.length} หัวข้อ`}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid Layout: Left 6 Cards + Right Decorative Quote Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Left Cards Grid (8 cols on lg) */}
        <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {displayedTopics.map((topic) => (
            <div
              key={topic.id}
              onClick={() => onSelectTopic(topic.query)}
              className="group relative bg-white hover:bg-[#FAF8F3] rounded-2xl p-4 border border-[#E9E4DA] hover:border-[#2D5A43]/40 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Top Row: Icon + Category Tag */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF8F3] border border-[#ECE6D9] flex items-center justify-center group-hover:scale-105 transition-transform">
                    {getTopicIcon(topic.icon)}
                  </div>

                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getCategoryTheme(
                      topic.badge
                    )}`}
                  >
                    {topic.badge}
                  </span>
                </div>

                {/* Question Title */}
                <h4 className="text-xs sm:text-sm font-bold text-[#1F3327] group-hover:text-[#18462F] leading-snug line-clamp-2">
                  {topic.title}
                </h4>
              </div>

              {/* Bottom Action */}
              <div className="mt-3 pt-2.5 border-t border-[#F2ECE0] flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#829587]">
                  {topic.category}
                </span>

                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#2D5A43] group-hover:translate-x-0.5 transition-transform">
                  <span>ดูคำตอบ</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Hospitality Quote Card (3 cols on lg) */}
        <div className="lg:col-span-3 bg-gradient-to-br from-[#FAF8F3] via-[#F4EFE3] to-[#EBE3D3] rounded-2xl p-5 border border-[#E2DDD0] shadow-xs flex flex-col justify-between relative overflow-hidden">
          {/* Leaf watermark accent */}
          <div className="absolute -right-6 -bottom-6 opacity-15 pointer-events-none">
            <svg width="140" height="140" viewBox="0 0 100 100" fill="#1B3D2F">
              <path d="M50 0 C70 30 100 50 100 100 C50 100 30 70 0 50 C0 30 30 0 50 0 Z" />
            </svg>
          </div>

          <div className="relative z-10">
            <div className="w-8 h-8 rounded-full bg-[#1B3D2F] text-[#E5BF77] flex items-center justify-center text-xs font-bold mb-3 shadow-xs">
              “
            </div>

            <p className="text-sm sm:text-base text-[#1E3B2C] font-handwriting leading-snug font-bold">
              “ ความรู้สึกดีๆ ช่วยให้การบริการของเราพิเศษขึ้นในทุกวัน ”
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#DED7C7] relative z-10">
            <div className="text-xs font-bold text-[#2B4E38]">
              Baan Home Resort & Restaurant
            </div>
            <div className="text-[11px] text-[#7A8E80]">
              More Than A Stay &middot; เพราะความใส่ใจคือหัวใจ
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
