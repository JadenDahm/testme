'use client';

interface TestMeLogoProps {
  size?: number;
  className?: string;
}

export function TestMeLogo({ size = 24, className = '' }: TestMeLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shield background with gradient */}
      <defs>
        <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b54a5" />
          <stop offset="100%" stopColor="#2f4487" />
        </linearGradient>
        <linearGradient id="checkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#58b247" />
          <stop offset="100%" stopColor="#4a9a3a" />
        </linearGradient>
      </defs>
      
      {/* Shield shape */}
      <path
        d="M12 2L4 5V11C4 16.55 7.16 21.74 12 23C16.84 21.74 20 16.55 20 11V5L12 2Z"
        fill="url(#shieldGradient)"
        stroke="rgba(0,0,0,0.1)"
        strokeWidth="0.5"
      />
      
      {/* Check mark inside */}
      <path
        d="M9 12L11 14L15 10"
        stroke="url(#checkGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Subtle shine effect */}
      <path
        d="M12 2L4 5V11C4 16.55 7.16 21.74 12 23"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
