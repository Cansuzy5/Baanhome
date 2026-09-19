import React from 'react';
import { Sparkles, Waves, Hotel, UtensilsCrossed, Users, Heart, MapPin, ArrowRight, Image as ImageIcon } from 'lucide-react';

interface ServiceShowcaseSectionProps {
  onSelectQuery: (query: string) => void;
}

export const ServiceShowcaseSection: React.FC<ServiceShowcaseSectionProps> = ({ onSelectQuery }) => {
  return (
    <div className="space-y-6 mb-8">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#1B3D2F] to-[#2D5A43] text-white p-6 sm:p-8 shadow-md">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 hidden md:block">
          <img
            src="https://images.unsplash.com/photo-1542314831-c6a4d142104d?auto=format&fit=crop&q=80&w=1200"
            alt="Baan Home Resort"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 rounded-full text-xs font-semibold text-[#E8F3EB] mb-3 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#E8C57D]" /> ประตูสู่กาฬสินธุ์ • One Destination
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            คลังความรู้และภาพบริการบ้านโฮม
          </h2>
          <p className="text-sm text-[#C6DACD] leading-relaxed mb-5">
            รวบรวมข้อมูลบริการและภาพประกอบสถานที่จริงของบ้านโฮม ทั้งพูลวิลล่า รีสอร์ท สวนอาหาร และจัดเลี้ยง
          </p>

          {/* Quick Pill Triggers */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => onSelectQuery('พูลวิลล่า')}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-medium transition-colors cursor-pointer"
            >
              🏊‍♂️ พูลวิลล่าส่วนตัว
            </button>
            <button
              type="button"
              onClick={() => onSelectQuery('รีสอร์ท เช็คอิน')}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-medium transition-colors cursor-pointer"
            >
              🛏️ ห้องพัก & เช็คอิน
            </button>
            <button
              type="button"
              onClick={() => onSelectQuery('สวนอาหาร เมนู')}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-medium transition-colors cursor-pointer"
            >
              🍲 สวนอาหาร & เมนู
            </button>
            <button
              type="button"
              onClick={() => onSelectQuery('จัดเลี้ยง สัมมนา')}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-medium transition-colors cursor-pointer"
            >
              🎤 ห้องประชุม MICE
            </button>
          </div>
        </div>
      </div>

      {/* Service Showcase Grid with Real Curated Photos */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-[#1B3D2F] flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#2D5A43]" /> หมวดบริการและภาพประกอบสถานที่
          </h3>
          <span className="text-xs text-[#708477]">แตะเพื่อค้นหาข้อมูลและข้อความตอบลูกค้า</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Pool Villa */}
          <div 
            onClick={() => onSelectQuery('พูลวิลล่า')}
            className="group bg-white rounded-2xl border border-[#D5DFD8] hover:border-[#2D5A43] overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
          >
            <div className="relative aspect-16/10 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80" 
                alt="พูลวิลล่าบ้านโฮม" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-[#1B3D2F]/80 text-white text-[11px] font-bold backdrop-blur-xs flex items-center gap-1">
                <Waves className="w-3 h-3 text-[#7BE495]" /> พูลวิลล่า
              </span>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#1B3D2F] group-hover:text-[#2D5A43] transition-colors">
                  พูลวิลล่าส่วนตัวพร้อมสระว่ายน้ำ
                </h4>
                <p className="text-xs text-[#526B5C] mt-1 line-clamp-2">
                  บ้านพักสระว่ายน้ำส่วนตัว รองรับปาร์ตี้ครอบครัว เครื่องเสียง คาราโอเกะ และเตาปิ้งย่าง
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#F0F5F1] flex items-center justify-between text-xs text-[#2D5A43] font-semibold">
                <span>ดูเงื่อนไข & ราคา</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Resort & Rooms */}
          <div 
            onClick={() => onSelectQuery('ห้องพัก รีสอร์ท')}
            className="group bg-white rounded-2xl border border-[#D5DFD8] hover:border-[#2D5A43] overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
          >
            <div className="relative aspect-16/10 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80" 
                alt="ห้องพักรีสอร์ท" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-[#1B3D2F]/80 text-white text-[11px] font-bold backdrop-blur-xs flex items-center gap-1">
                <Hotel className="w-3 h-3 text-[#7BE495]" /> รีสอร์ท & ห้องพัก
              </span>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#1B3D2F] group-hover:text-[#2D5A43] transition-colors">
                  ห้องพัก Deluxe & สระว่ายน้ำส่วนกลาง
                </h4>
                <p className="text-xs text-[#526B5C] mt-1 line-clamp-2">
                  ห้องพักเตียงเดี่ยว/เตียงคู่ พร้อมระเบียงวิวสวน สระว่ายน้ำระบบเกลือ และอาหารเช้า
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#F0F5F1] flex items-center justify-between text-xs text-[#2D5A43] font-semibold">
                <span>ดูข้อมูลห้องพัก</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Restaurant */}
          <div 
            onClick={() => onSelectQuery('สวนอาหาร เมนู')}
            className="group bg-white rounded-2xl border border-[#D5DFD8] hover:border-[#2D5A43] overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
          >
            <div className="relative aspect-16/10 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80" 
                alt="สวนอาหารบ้านโฮม" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-[#1B3D2F]/80 text-white text-[11px] font-bold backdrop-blur-xs flex items-center gap-1">
                <UtensilsCrossed className="w-3 h-3 text-[#7BE495]" /> สวนอาหารบ้านโฮม
              </span>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#1B3D2F] group-hover:text-[#2D5A43] transition-colors">
                  สวนอาหาร & เมนูรสเด็ด
                </h4>
                <p className="text-xs text-[#526B5C] mt-1 line-clamp-2">
                  เปิด 11:00–22:00 น. ลานบน ลานน้ำตก ห้อง VIP รองรับมื้ออาหารครอบครัวและคณะทัวร์
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#F0F5F1] flex items-center justify-between text-xs text-[#2D5A43] font-semibold">
                <span>ดูเวลา & เมนูแนะนำ</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Mini MICE */}
          <div 
            onClick={() => onSelectQuery('ห้องประชุม สัมมนา จัดเลี้ยง')}
            className="group bg-white rounded-2xl border border-[#D5DFD8] hover:border-[#2D5A43] overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
          >
            <div className="relative aspect-16/10 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80" 
                alt="ห้องประชุมสัมมนา" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-[#1B3D2F]/80 text-white text-[11px] font-bold backdrop-blur-xs flex items-center gap-1">
                <Users className="w-3 h-3 text-[#7BE495]" /> Mini MICE & จัดเลี้ยง
              </span>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#1B3D2F] group-hover:text-[#2D5A43] transition-colors">
                  ห้องประชุมสัมมนา & งานจัดเลี้ยง
                </h4>
                <p className="text-xs text-[#526B5C] mt-1 line-clamp-2">
                  รองรับ 20–80 ท่าน พร้อมโปรเจกเตอร์ เครื่องเสียง คอฟฟี่เบรค และเซ็ตอาหารกลางวัน
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#F0F5F1] flex items-center justify-between text-xs text-[#2D5A43] font-semibold">
                <span>ดูแพ็กเกจจัดเลี้ยง</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Pet Friendly */}
          <div 
            onClick={() => onSelectQuery('สัตว์เลี้ยง')}
            className="group bg-white rounded-2xl border border-[#D5DFD8] hover:border-[#2D5A43] overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
          >
            <div className="relative aspect-16/10 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80" 
                alt="สัตว์เลี้ยงเข้าพักได้" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-[#1B3D2F]/80 text-white text-[11px] font-bold backdrop-blur-xs flex items-center gap-1">
                <Heart className="w-3 h-3 text-[#7BE495]" /> สัตว์เลี้ยงเข้าพักได้
              </span>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#1B3D2F] group-hover:text-[#2D5A43] transition-colors">
                  Pet-Friendly รีสอร์ทต้อนรับน้องๆ
                </h4>
                <p className="text-xs text-[#526B5C] mt-1 line-clamp-2">
                  พาน้องหมาน้องแมวมาพักผ่อนในโซนที่กำหนด มีสนามหญ้ากว้างขวาง
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#F0F5F1] flex items-center justify-between text-xs text-[#2D5A43] font-semibold">
                <span>ดูกฎและค่าบริการสัตว์เลี้ยง</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Location & Map */}
          <div 
            onClick={() => onSelectQuery('แผนที่ ที่อยู่')}
            className="group bg-white rounded-2xl border border-[#D5DFD8] hover:border-[#2D5A43] overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
          >
            <div className="relative aspect-16/10 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80" 
                alt="แผนที่และการเดินทาง" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-[#1B3D2F]/80 text-white text-[11px] font-bold backdrop-blur-xs flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#7BE495]" /> แผนที่ & ที่ตั้ง
              </span>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#1B3D2F] group-hover:text-[#2D5A43] transition-colors">
                  พิกัด Google Maps & การเดินทาง
                </h4>
                <p className="text-xs text-[#526B5C] mt-1 line-clamp-2">
                  141 หมู่ 2 ต.คลองขาม อ.ยางตลาด จ.กาฬสินธุ์ ลิงก์นำทาง GPS พร้อมส่งลูกค้า
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#F0F5F1] flex items-center justify-between text-xs text-[#2D5A43] font-semibold">
                <span>คัดลอกลิงก์นำทาง</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
