// 앱 전용 라인 아이콘(외부 아이콘 라이브러리 없이 인라인 SVG)
import type { SVGProps } from 'react';

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
});

export const BackIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M15 18l-6-6 6-6" /></svg>
);

export const CalendarIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M7 3v4M17 3v4M3 10h18M8 14h2M14 14h2M8 17h2" />
  </svg>
);

export const SoundIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor" stroke="none" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
  </svg>
);

export const MuteIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor" stroke="none" />
    <path d="M17 9l5 6M22 9l-5 6" />
  </svg>
);

export const FlameIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ ...p, stroke: 'none' })}>
    <path
      fill="currentColor"
      d="M12 2c.6 3.1-1.3 4.6-2.8 6.4C7.6 10.3 6 12.3 6 15a6 6 0 0 0 12 0c0-2.4-1.1-4-2.2-5.3-.2 1.3-.9 2.3-2 2.8.4-3.7-.7-7.6-1.8-10.5z"
    />
  </svg>
);

export const LockIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 14, height: 14, ...p })}>
    <rect x="5" y="11" width="14" height="10" rx="3" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const ResetIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </svg>
);

export const EyeViewIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M4 14h16M12 4v10" />
  </svg>
);

export const PeopleIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 20, height: 20, ...p })}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.6-3.6 3.2-5.5 6.500-5.500s5.900 1.900 6.500 5.500" />
    <path d="M16 4.800a3.500 3.500 0 0 1 0 6.400M18.500 14.900c1.700.8 2.700 2.500 3 5.100" />
  </svg>
);

export const CoinIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 18, height: 18, stroke: 'none', ...p })}>
    <circle cx="12" cy="12" r="10" fill="#F2C46B" />
    <circle cx="12" cy="12" r="6.500" fill="none" stroke="#D99A2B" strokeWidth="2" />
  </svg>
);
