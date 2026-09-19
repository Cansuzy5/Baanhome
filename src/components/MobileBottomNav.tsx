import React from 'react';
import { MessageSquare, BookOpen, History, Target, ShieldCheck, User } from 'lucide-react';
import { UserRole } from '../types';

interface MobileBottomNavProps {
  activeTab: 'qa' | 'b2b' | 'sheets' | 'unanswered' | 'docs' | 'arch' | 'users';
  onSelectTab: (tab: 'qa' | 'b2b' | 'sheets' | 'unanswered' | 'docs' | 'arch' | 'users') => void;
  currentRole?: UserRole;
  onOpenProfile?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  currentRole = 'Knowledge User',
  onOpenProfile,
}) => {
  return (
    <nav 
      aria-label="เมนูนำทางหลักบนมือถือ"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EDE7DB] px-2 py-1.5 shadow-lg"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* 1. 💬 ถาม-ตอบ (All Roles) */}
        <button
          type="button"
          onClick={() => onSelectTab('qa')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'qa'
              ? 'text-[#1E3D2F] font-bold'
              : 'text-[#697E72] hover:text-[#1E3D2F]'
          }`}
        >
          <div
            className={`p-1 rounded-full ${
              activeTab === 'qa' ? 'bg-[#EEF5EC]' : ''
            }`}
          >
            <MessageSquare className="w-4 h-4" />
          </div>
          <span className="text-[10px] leading-none">ถาม-ตอบ</span>
        </button>

        {/* 2. 📚 ความรู้ (All Roles) */}
        <button
          type="button"
          onClick={() => onSelectTab('docs')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'docs'
              ? 'text-[#1E3D2F] font-bold'
              : 'text-[#697E72] hover:text-[#1E3D2F]'
          }`}
        >
          <div
            className={`p-1 rounded-full ${
              activeTab === 'docs' ? 'bg-[#EEF5EC]' : ''
            }`}
          >
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="text-[10px] leading-none">ความรู้</span>
        </button>

        {/* 3. 🎯 B2B Leads (Operator & Administrator only) */}
        {currentRole !== 'Knowledge User' && (
          <button
            type="button"
            onClick={() => onSelectTab('b2b')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'b2b'
                ? 'text-[#1E3D2F] font-bold'
                : 'text-[#697E72] hover:text-[#1E3D2F]'
            }`}
          >
            <div
              className={`p-1 rounded-full ${
                activeTab === 'b2b' ? 'bg-[#EEF5EC]' : ''
              }`}
            >
              <Target className="w-4 h-4 text-[#C98B22]" />
            </div>
            <span className="text-[10px] leading-none">B2B (101)</span>
          </button>
        )}

        {/* 4. 👑 จัดการสิทธิ์ผู้ใช้ (Administrator Only) */}
        {currentRole === 'Administrator' ? (
          <button
            type="button"
            onClick={() => onSelectTab('users')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'text-[#9A5B08] font-bold'
                : 'text-[#697E72] hover:text-[#9A5B08]'
            }`}
          >
            <div
              className={`p-1 rounded-full ${
                activeTab === 'users' ? 'bg-[#FEF6E8]' : ''
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#9A5B08]" />
            </div>
            <span className="text-[10px] leading-none">สิทธิ์ผู้ใช้</span>
          </button>
        ) : (
          /* For non-admins: History or Profile shortcut */
          currentRole === 'Operator' ? (
            <button
              type="button"
              onClick={() => onSelectTab('sheets')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'sheets'
                  ? 'text-[#1E3D2F] font-bold'
                  : 'text-[#697E72] hover:text-[#1E3D2F]'
              }`}
            >
              <div
                className={`p-1 rounded-full ${
                  activeTab === 'sheets' ? 'bg-[#EEF5EC]' : ''
                }`}
              >
                <History className="w-4 h-4" />
              </div>
              <span className="text-[10px] leading-none">ประวัติ</span>
            </button>
          ) : (
            onOpenProfile && (
              <button
                type="button"
                onClick={onOpenProfile}
                className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer text-[#697E72] hover:text-[#1E3D2F]"
              >
                <div className="p-1 rounded-full">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-[10px] leading-none">โปรไฟล์</span>
              </button>
            )
          )
        )}
      </div>
    </nav>
  );
};
