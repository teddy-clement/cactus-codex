interface CactusLogoProps {
  size?: number
  className?: string
}

export default function CactusLogo({ size = 76, className = '' }: CactusLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Cat body */}
      <path d="M14 66 L14 38 L24 22 L40 19 L40 27 L33 27 L33 32 L40 32 L40 66 Z" fill="#4ade80"/>
      {/* Ear */}
      <path d="M14 38 L6 26 L17 30 Z" fill="#4ade80"/>
      {/* Torso */}
      <path d="M14 66 L40 66 L40 78 C40 82 37 85 33 85 L21 85 C17 85 14 82 14 78 Z" fill="#4ade80"/>
      {/* Eyes */}
      <ellipse cx="22" cy="43" rx="2.8" ry="3.4" fill="#060d08"/>
      <ellipse cx="32" cy="43" rx="2.8" ry="3.4" fill="#060d08"/>
      {/* Eye shine */}
      <ellipse cx="23" cy="42" rx="1" ry="1" fill="#4ade80"/>
      <ellipse cx="33" cy="42" rx="1" ry="1" fill="#4ade80"/>
      {/* Nose */}
      <path d="M27 51 L29 51 L28 53 Z" fill="#060d08"/>
      {/* Whiskers */}
      <line x1="4"  y1="49" x2="14" y2="50" stroke="#4ade80" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="4"  y1="54" x2="14" y2="53" stroke="#4ade80" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="40" y1="50" x2="49" y2="49" stroke="#4ade80" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="40" y1="53" x2="49" y2="54" stroke="#4ade80" strokeWidth="1.4" strokeLinecap="round"/>
      {/* CC letters */}
      <path d="M14 88 C14 85.5 15.8 84 18 84 L23 84 C25.2 84 27 85.5 27 88 L27 92 C27 93.8 26 95 24.5 95 L21 95 L21 97 L27 97 L27 100 L18 100 C15.8 100 14 98.5 14 96 Z" fill="#4ade80"/>
      <path d="M29 88 C29 85.5 30.8 84 33 84 L38 84 C40.2 84 42 85.5 42 88 L42 92 C42 93.8 41 95 39.5 95 L36 95 L36 97 L42 97 L42 100 L33 100 C30.8 100 29 98.5 29 96 Z" fill="#4ade80"/>
      {/* Ground */}
      <rect x="10" y="101" width="72" height="4" rx="2" fill="#4ade80" opacity=".35"/>
      {/* Cactus stem */}
      <rect x="62" y="26" width="12" height="65" rx="6" fill="#4ade80"/>
      {/* Left arm */}
      <rect x="50" y="44" width="14" height="9" rx="4.5" fill="#4ade80"/>
      <rect x="50" y="36" width="9" height="18" rx="4.5" fill="#4ade80"/>
      {/* Right arm */}
      <rect x="74" y="52" width="14" height="9" rx="4.5" fill="#4ade80"/>
      <rect x="79" y="44" width="9" height="18" rx="4.5" fill="#4ade80"/>
      {/* Spines */}
      <line x1="68" y1="26" x2="68" y2="19" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="64" y1="28" x2="60" y2="22" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="72" y1="28" x2="76" y2="22" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="52" y1="38" x2="47" y2="34" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="81" y1="46" x2="86" y2="42" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
