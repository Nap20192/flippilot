import { useId } from 'react';

/** Hex-and-bolt mark. */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={`lg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b9bff" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <path d="M24 4.5 41 14.25v19.5L24 43.5 7 33.75v-19.5z" fill={`url(#lg-${id})`} stroke={`url(#lg-${id})`} strokeWidth="3" strokeLinejoin="round" />
      <path d="M26.5 10 15.5 26.2h7.6L20.8 38 32.5 21.4h-7.8z" fill="#fff" />
    </svg>
  );
}
