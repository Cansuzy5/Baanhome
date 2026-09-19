import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StaffProfile } from '../types';
import { authenticateLogin } from '../utils/authService';
import { 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  X, 
  ArrowRight
} from 'lucide-react';
import tropicalVillaImg from '../assets/images/tropical_resort_villa_1788840573847.jpg';

interface UserWelcomeGateProps {
  isOpen: boolean;
  onSaveProfile: (profile: StaffProfile) => void;
  initialProfile?: StaffProfile | null;
  allowCancel?: boolean;
  onClose?: () => void;
}

export const UserWelcomeGate: React.FC<UserWelcomeGateProps> = ({
  isOpen,
  onSaveProfile,
  initialProfile,
  allowCancel = false,
  onClose,
}) => {
  const [username, setUsername] = useState(initialProfile?.username || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccessUser, setLoginSuccessUser] = useState<StaffProfile | null>(null);

  useEffect(() => {
    if (initialProfile?.username) {
      setUsername(initialProfile.username);
    }
  }, [initialProfile?.username]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim()) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้ (Username)');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('กรุณากรอกรหัสผ่าน');
      return;
    }

    try {
      setIsLoading(true);
      
      // Safety timeout guard: maximum 3.5 seconds so button never hangs
      const loginPromise = authenticateLogin(username.trim(), password.trim());
      const timeoutPromise = new Promise<{ success: boolean; error?: string; user?: any }>((resolve) =>
        setTimeout(
          () =>
            resolve({
              success: false,
              error: 'การเข้าสู่ระบบใช้เวลานานเกินกำหนด กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง',
            }),
          3500
        )
      );

      const result = await Promise.race([loginPromise, timeoutPromise]);

      if (!result.success || !result.user) {
        setErrorMsg(result.error || 'การเข้าสู่ระบบล้มเหลว');
        setIsLoading(false);
        return;
      }

      const authenticatedStaff: StaffProfile = {
        id: result.user.id,
        username: result.user.username,
        name: result.user.name,
        department: result.user.department,
        avatar: result.user.avatar || '🧑🏻‍💼',
        role: result.user.role,
        status: result.user.status,
        lastLoginAt: result.user.lastLoginAt,
      };

      setLoginSuccessUser(authenticatedStaff);

      setTimeout(() => {
        onSaveProfile(authenticatedStaff);
        setIsLoading(false);
      }, 400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
      setErrorMsg(msg);
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="user-login-gate-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-[#09150E]/85 backdrop-blur-xl overflow-y-auto"
      >
        {/* Animated Background Ambience */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-[#2D5A43]/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-[#E5BF77]/15 rounded-full blur-3xl animate-pulse" />
          <div 
            className="absolute inset-0 opacity-10 bg-cover bg-center mix-blend-overlay"
            style={{ backgroundImage: `url(${tropicalVillaImg})` }}
          />
        </div>

        {/* Master Login Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#D5E5D4]/60 overflow-hidden my-auto"
        >
          {/* Header Banner with Tropical House aesthetic */}
          <div className="bg-gradient-to-r from-[#143224] via-[#1B3D2F] to-[#254C39] px-6 py-6 sm:px-8 sm:py-7 text-white relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#E8C57D]/20 border border-[#E8C57D]/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
                  🏡
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#E8C57D] text-[#1B3D2F]">
                    BAAN HOME RESORT
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
                    เข้าสู่ระบบพนักงาน
                  </h2>
                </div>
              </div>

              {allowCancel && onClose && (
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <p className="text-xs text-[#C8DEC5] mt-2.5 leading-relaxed">
              กรุณาเข้าสู่ระบบด้วยบัญชีพนักงานเพื่อเข้าถึงระบบค้นหาข้อมูลและบริการ
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-[#FDECEE] border border-[#F7BFC9] text-[#B8324E] text-xs flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Success Animation */}
            {loginSuccessUser && (
              <div className="p-3.5 rounded-xl bg-[#EBF7EE] border border-[#BDE5C8] text-[#1E6038] text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-[#1E6038]" />
                <span className="font-bold">
                  ยินดีต้อนรับคุณ {loginSuccessUser.name} เข้าสู่ระบบเรียบร้อยแล้ว
                </span>
              </div>
            )}

            {/* CLEAN PRODUCTION LOGIN FORM */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2C3E33] mb-1.5">
                  ชื่อผู้ใช้ (Username)
                </label>
                <div className="relative">
                  <input
                    id="login-username-input"
                    type="text"
                    placeholder="กรอกชื่อผู้ใช้ เช่น admin, kuser"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#D5D0C5] focus:outline-none focus:border-[#1B3D2F] bg-[#FAF8F5] text-[#1B3D2F]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E33] mb-1.5">
                  รหัสผ่าน (Password)
                </label>
                <div className="relative">
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="กรอกรหัสผ่าน"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3.5 pr-11 py-2.5 text-sm rounded-xl border border-[#D5D0C5] focus:outline-none focus:border-[#1B3D2F] bg-[#FAF8F5] text-[#1B3D2F]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#889E90] hover:text-[#1B3D2F] p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="submit-login-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white bg-[#1B3D2F] hover:bg-[#244E3C] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>กำลังเข้าสู่ระบบ...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>เข้าสู่ระบบ</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-[#889E90]">
                ระบบสารสนเทศภายใน บ้านโฮม สวนอาหาร แอนด์ รีสอร์ท &bull; หากลืมรหัสผ่านติดต่อผู้จัดการ
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
