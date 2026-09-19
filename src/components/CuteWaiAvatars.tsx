import React from 'react';

interface AvatarProps {
  className?: string;
  size?: number;
}

/**
 * Cute Male Hospitality Staff in Thai "Wai" (ไหว้) Greeting Pose
 */
export const CuteBoyWaiAvatar: React.FC<AvatarProps> = ({ className = '', size = 96 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
      aria-label="พนักงานชายไหว้สวัสดี"
    >
      <defs>
        {/* Gradients */}
        <radialGradient id="boyFaceGrad" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0%" stopColor="#FFF2E2" />
          <stop offset="100%" stopColor="#F7DFCA" />
        </radialGradient>
        <linearGradient id="boyShirtGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B3E2D" />
          <stop offset="100%" stopColor="#122A1E" />
        </linearGradient>
        <linearGradient id="goldTrimGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5D77F" />
          <stop offset="100%" stopColor="#D4A843" />
        </linearGradient>
        <filter id="softShadowBoy" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1B3E2D" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* Background circular halo */}
      <circle cx="60" cy="60" r="56" fill="#EAF3E9" stroke="#CFE4CE" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="50" fill="#FFFFFF" opacity="0.6" />

      {/* Shoulders & Uniform Shirt */}
      <path
        d="M24 108C24 93 36 82 50 80L60 84L70 80C84 82 96 93 96 108C96 114 90 116 84 116H36C30 116 24 114 24 108Z"
        fill="url(#boyShirtGrad)"
        filter="url(#softShadowBoy)"
      />

      {/* Collar & Gold trim */}
      <path d="M50 80L60 93L70 80" stroke="url(#goldTrimGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="60" cy="98" r="2.5" fill="url(#goldTrimGrad)" />

      {/* Neck */}
      <path d="M52 72H68V82C68 85 64 88 60 88C56 88 52 85 52 82V72Z" fill="#F4D9C3" />

      {/* Ears */}
      <circle cx="37" cy="53" r="6" fill="#F7DFCA" />
      <circle cx="37" cy="53" r="3" fill="#EAC2A8" />
      <circle cx="83" cy="53" r="6" fill="#F7DFCA" />
      <circle cx="83" cy="53" r="3" fill="#EAC2A8" />

      {/* Head */}
      <ellipse cx="60" cy="52" rx="23" ry="24" fill="url(#boyFaceGrad)" />

      {/* Hair - Neat Male Hospitality Cut */}
      <path
        d="M37 46C37 32 47 24 60 24C73 24 83 32 83 46C83 48 81 48 80 44C78 38 72 32 60 32C48 32 42 38 40 44C39 48 37 48 37 46Z"
        fill="#231F20"
      />
      <path
        d="M40 37C45 30 52 27 60 27C69 27 75 31 79 36C77 34 71 31 63 32C53 33 46 38 40 37Z"
        fill="#3D3534"
      />
      {/* Sideburns */}
      <path d="M37 45V52L40 49V45H37Z" fill="#231F20" />
      <path d="M83 45V52L80 49V45H83Z" fill="#231F20" />

      {/* Eyebrows */}
      <path d="M47 45C50 43 53 43 55 45" stroke="#231F20" strokeWidth="2" strokeLinecap="round" />
      <path d="M65 45C67 43 70 43 73 45" stroke="#231F20" strokeWidth="2" strokeLinecap="round" />

      {/* Cheerful Smiling Eyes */}
      <path d="M47 51C49 54 53 54 55 51" stroke="#231F20" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M65 51C67 54 71 54 73 51" stroke="#231F20" strokeWidth="2.5" strokeLinecap="round" />

      {/* Cute Rosy Cheeks */}
      <ellipse cx="45" cy="57" rx="3.5" ry="2" fill="#F8A596" opacity="0.65" />
      <ellipse cx="75" cy="57" rx="3.5" ry="2" fill="#F8A596" opacity="0.65" />

      {/* Nose */}
      <circle cx="60" cy="55" r="1.5" fill="#DFA88C" />

      {/* Happy Welcoming Smile */}
      <path
        d="M54 59C56 63 64 63 66 59"
        stroke="#A8433A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Sparkle of greeting */}
      <path d="M57 60C58 61.5 62 61.5 63 60" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />

      {/* Hands in Thai "Wai" (ไหว้) Pose - Two palms together at chest level */}
      {/* Left Forearm */}
      <path d="M38 100C42 94 48 88 56 86L54 94C47 96 42 101 38 100Z" fill="#1B3E2D" />
      {/* Right Forearm */}
      <path d="M82 100C78 94 72 88 64 86L66 94C73 96 78 101 82 100Z" fill="#1B3E2D" />

      {/* Folded Palms Pressed Together (Wai) */}
      <g filter="url(#softShadowBoy)">
        {/* Palm base */}
        <ellipse cx="60" cy="85" rx="7" ry="9" fill="#FADDC6" />
        {/* Fingertips pointing up gracefully */}
        <path
          d="M55 86C56 77 59 72 60 70C61 72 64 77 65 86C65 91 63 94 60 94C57 94 55 91 55 86Z"
          fill="#FFF0DF"
          stroke="#E8BC9E"
          strokeWidth="1.2"
        />
        {/* Thumb details */}
        <path d="M56 85C55 82 56 80 58 79" stroke="#E5B293" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M64 85C65 82 64 80 62 79" stroke="#E5B293" strokeWidth="1.2" strokeLinecap="round" />
        {/* Center fold line */}
        <path d="M60 71V90" stroke="#DDA887" strokeWidth="1.2" strokeLinecap="round" />
      </g>

      {/* Little floating greeting stars / sparkles */}
      <path d="M25 32L27 36L31 37L28 40L29 44L25 41L21 44L22 40L19 37L23 36L25 32Z" fill="#FFCA3A" opacity="0.85" />
      <circle cx="95" cy="35" r="2.5" fill="#E5BF77" />
      <circle cx="99" cy="42" r="1.5" fill="#E5BF77" />
    </svg>
  );
};

/**
 * Cute Female Hospitality Staff in Thai "Wai" (ไหว้) Greeting Pose
 */
export const CuteGirlWaiAvatar: React.FC<AvatarProps> = ({ className = '', size = 96 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
      aria-label="พนักงานหญิงไหว้สวัสดี"
    >
      <defs>
        {/* Gradients */}
        <radialGradient id="girlFaceGrad" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0%" stopColor="#FFF5E8" />
          <stop offset="100%" stopColor="#F9E2CF" />
        </radialGradient>
        <linearGradient id="girlShirtGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B3E2D" />
          <stop offset="100%" stopColor="#122A1E" />
        </linearGradient>
        <linearGradient id="girlGoldTrim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5D77F" />
          <stop offset="100%" stopColor="#D4A843" />
        </linearGradient>
        <filter id="softShadowGirl" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1B3E2D" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* Background circular halo */}
      <circle cx="60" cy="60" r="56" fill="#F9F2E7" stroke="#ECDDC4" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="50" fill="#FFFFFF" opacity="0.65" />

      {/* Bun Hair at back */}
      <circle cx="60" cy="22" r="12" fill="#231F20" />
      {/* Gold Hairpin / Bun Tie */}
      <ellipse cx="60" cy="26" rx="8" ry="3" fill="url(#girlGoldTrim)" />

      {/* Shoulders & Uniform Shirt */}
      <path
        d="M24 108C24 93 36 82 50 80L60 84L70 80C84 82 96 93 96 108C96 114 90 116 84 116H36C30 116 24 114 24 108Z"
        fill="url(#girlShirtGrad)"
        filter="url(#softShadowGirl)"
      />

      {/* Feminine Rounded Collar with Gold Border */}
      <path
        d="M48 80C48 85 54 89 60 89C66 89 72 85 72 80"
        stroke="url(#girlGoldTrim)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="60" cy="94" r="2.5" fill="url(#girlGoldTrim)" />

      {/* Neck */}
      <path d="M53 72H67V82C67 85 64 87 60 87C56 87 53 85 53 82V72Z" fill="#F5DAC3" />

      {/* Ears with cute Pearl Earrings */}
      <circle cx="36" cy="53" r="5.5" fill="#F9E2CF" />
      <circle cx="35" cy="56" r="2.2" fill="#FFFFFF" stroke="#E2B77B" strokeWidth="0.8" />
      <circle cx="84" cy="53" r="5.5" fill="#F9E2CF" />
      <circle cx="85" cy="56" r="2.2" fill="#FFFFFF" stroke="#E2B77B" strokeWidth="0.8" />

      {/* Head */}
      <ellipse cx="60" cy="52" rx="22.5" ry="23.5" fill="url(#girlFaceGrad)" />

      {/* Hair - Neat Front & Bangs */}
      <path
        d="M36 48C36 33 46 25 60 25C74 25 84 33 84 48C84 50 82 50 81 45C79 38 73 34 68 33C57 32 44 36 39 45C38 49 36 50 36 48Z"
        fill="#231F20"
      />
      {/* Soft parted fringe */}
      <path
        d="M41 39C48 33 56 32 67 34C60 38 52 41 42 42C40 42 40 40 41 39Z"
        fill="#322C2B"
      />

      {/* Cute Jasmine/Champa Flower in Hair (Right Side) */}
      <g transform="translate(77, 30)">
        <circle cx="0" cy="0" r="4.5" fill="#FFFFFF" stroke="#F5D77F" strokeWidth="1" />
        <circle cx="-3" cy="-3" r="3" fill="#FFFFFF" />
        <circle cx="3" cy="-3" r="3" fill="#FFFFFF" />
        <circle cx="-3" cy="3" r="3" fill="#FFFFFF" />
        <circle cx="3" cy="3" r="3" fill="#FFFFFF" />
        <circle cx="0" cy="0" r="2" fill="#F5C343" />
      </g>

      {/* Eyebrows - Soft Arched */}
      <path d="M47 44.5C49 43 53 43 55 44.5" stroke="#231F20" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M65 44.5C67 43 71 43 73 44.5" stroke="#231F20" strokeWidth="1.8" strokeLinecap="round" />

      {/* Sweet Smiling Eyes with cute lashes */}
      <path d="M47 50.5C49 53.5 53 53.5 55 50.5" stroke="#231F20" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M55 49.5L56.5 48" stroke="#231F20" strokeWidth="1.2" strokeLinecap="round" />
      
      <path d="M65 50.5C67 53.5 71 53.5 73 50.5" stroke="#231F20" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M73 49.5L74.5 48" stroke="#231F20" strokeWidth="1.2" strokeLinecap="round" />

      {/* Rosy Cheeks */}
      <ellipse cx="44" cy="56" rx="4" ry="2.2" fill="#FF9E9E" opacity="0.6" />
      <ellipse cx="76" cy="56" rx="4" ry="2.2" fill="#FF9E9E" opacity="0.6" />

      {/* Tiny Cute Nose */}
      <circle cx="60" cy="54.5" r="1.3" fill="#DFA88C" />

      {/* Sweet Gracious Smile */}
      <path
        d="M54 58.5C56 63 64 63 66 58.5"
        stroke="#B23E3A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Lip gloss sparkle */}
      <ellipse cx="60" cy="61" rx="2" ry="1" fill="#FFDADA" />

      {/* Hands in Thai "Wai" (ไหว้) Pose - Two palms together at chest level */}
      {/* Left Forearm */}
      <path d="M38 100C42 94 48 88 56 86L54 94C47 96 42 101 38 100Z" fill="#1B3E2D" />
      {/* Right Forearm */}
      <path d="M82 100C78 94 72 88 64 86L66 94C73 96 78 101 82 100Z" fill="#1B3E2D" />

      {/* Folded Palms Pressed Together (Wai) */}
      <g filter="url(#softShadowGirl)">
        {/* Palm base */}
        <ellipse cx="60" cy="85" rx="6.5" ry="8.5" fill="#FADDC6" />
        {/* Slender fingers pointing up gracefully */}
        <path
          d="M55.5 86C56.5 77 59 71 60 69C61 71 63.5 77 64.5 86C64.5 90.5 63 93.5 60 93.5C57 93.5 55.5 90.5 55.5 86Z"
          fill="#FFF4E9"
          stroke="#E8BC9E"
          strokeWidth="1.1"
        />
        {/* Thumb details */}
        <path d="M56.5 84C55.5 81 56.5 79 58 78" stroke="#E5B293" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M63.5 84C64.5 81 63.5 79 62 78" stroke="#E5B293" strokeWidth="1.1" strokeLinecap="round" />
        {/* Center line */}
        <path d="M60 70V89" stroke="#DDA887" strokeWidth="1.1" strokeLinecap="round" />
      </g>

      {/* Little floating greeting stars / sparkles */}
      <path d="M96 32L98 36L102 37L99 40L100 44L96 41L92 44L93 40L90 37L94 36L96 32Z" fill="#FFCA3A" opacity="0.85" />
      <circle cx="23" cy="36" r="2" fill="#E5BF77" />
      <circle cx="27" cy="43" r="1.3" fill="#E5BF77" />
    </svg>
  );
};

/**
 * Cute Couple Greeting Banner (Male & Female waiing together)
 */
export const CuteWaiCoupleBanner: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center justify-center gap-3 sm:gap-6 py-2 select-none ${className}`}>
      {/* Male Staff Wai */}
      <div className="flex flex-col items-center text-center group">
        <div className="relative transition-transform duration-300 group-hover:scale-105">
          <CuteBoyWaiAvatar size={92} />
          <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-[#1B3E2D] text-[#F3E2BD] text-[10px] font-bold border border-[#E5BF77] shadow-xs">
            สวัสดีครับ 🙏
          </span>
        </div>
        <span className="text-[11px] font-bold text-[#1B3D2F] mt-1.5">น้องโฮม (ชาย)</span>
      </div>

      {/* Heart / Welcome Flower Center Badge */}
      <div className="flex flex-col items-center justify-center px-1">
        <div className="w-10 h-10 rounded-full bg-[#F5EFE4] border border-[#DFCBB5] flex items-center justify-center text-lg shadow-xs animate-bounce">
          🍃
        </div>
        <span className="text-[10px] font-medium text-[#7D6649] mt-1 font-handwriting">
          ยินดีต้อนรับ
        </span>
      </div>

      {/* Female Staff Wai */}
      <div className="flex flex-col items-center text-center group">
        <div className="relative transition-transform duration-300 group-hover:scale-105">
          <CuteGirlWaiAvatar size={92} />
          <span className="absolute -bottom-1 -left-1 px-2 py-0.5 rounded-full bg-[#1B3E2D] text-[#F3E2BD] text-[10px] font-bold border border-[#E5BF77] shadow-xs">
            สวัสดีค่ะ 🙏
          </span>
        </div>
        <span className="text-[11px] font-bold text-[#1B3D2F] mt-1.5">น้องโฮม (หญิง)</span>
      </div>
    </div>
  );
};
