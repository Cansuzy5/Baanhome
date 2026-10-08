import React from 'react';
// Small vector decoration: no image download, data replacement or network calls.
function Branch({ className }: { className: string }) {
  return <svg className={className} viewBox="0 0 250 520" fill="none" aria-hidden="true" focusable="false">
    <g stroke="#839a72" strokeWidth="1.2" strokeLinecap="round">
      <path d="M222 512C203 418 207 348 160 260C126 190 106 103 65 10" />
      <path d="M203 433C163 398 140 393 88 375M185 346C211 299 222 262 235 219M154 249C115 230 82 231 29 204M118 161C147 115 171 91 203 59M83 62C54 64 30 56 8 37" />
    </g>
    <g fill="#b1bda0" stroke="#91a47e" strokeWidth=".7">
      <path d="M200 422C140 373 114 345 112 294C161 317 178 358 200 422Z" />
      <path d="M200 423C219 375 249 355 247 308C207 324 197 375 200 423Z" />
      <path d="M160 399C131 352 111 346 67 339C82 380 116 393 160 399Z" />
      <path d="M104 380C65 341 32 339 8 353C33 380 69 389 104 380Z" />
      <path d="M191 333C181 277 192 254 211 225C226 266 212 303 191 333Z" />
      <path d="M219 273C229 232 240 208 244 178C209 195 200 234 219 273Z" />
      <path d="M158 257C119 210 92 188 78 149C125 158 148 200 158 257Z" />
      <path d="M110 232C77 192 49 180 14 168C29 213 68 232 110 232Z" />
      <path d="M40 210C20 174 3 163 0 138C32 149 51 180 40 210Z" />
      <path d="M118 160C120 107 116 83 135 48C157 92 142 126 118 160Z" />
      <path d="M164 102C177 65 190 48 217 25C222 66 193 90 164 102Z" />
      <path d="M82 70C49 37 31 31 10 8C9 45 48 70 82 70Z" />
    </g>
    <g stroke="#839a72" strokeWidth=".6"><path d="M201 422L120 309M160 399L78 345M106 380L17 357M191 333L211 237M158 257L84 158M110 232L26 178M118 160L134 62M164 102L213 35" /></g>
    <g fill="#d8caa2"><ellipse cx="202" cy="201" rx="10" ry="15" transform="rotate(12 202 201)"/><ellipse cx="60" cy="307" rx="9" ry="14" transform="rotate(-30 60 307)"/></g>
  </svg>;
}
export function BotanicalBackdrop() {
  return <div className="qa-botanical-backdrop" aria-hidden="true"><div className="qa-ambient-light" /><Branch className="qa-branch qa-branch-right" /><Branch className="qa-branch qa-branch-left" /></div>;
}
