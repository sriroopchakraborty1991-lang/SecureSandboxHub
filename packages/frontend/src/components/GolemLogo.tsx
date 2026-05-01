import React from 'react';

export default function GolemLogo(props: {size?: number; withWordmark?: boolean}) {
  const size = props.size ?? 24;
  const withWordmark = props.withWordmark ?? true;

  return (
    <span className="golem-logo" style={{display: 'inline-flex', alignItems: 'center', gap: 10}}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="golem_g" x1="10" y1="10" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#20E3D2" />
            <stop offset="0.55" stopColor="#7C5CFF" />
            <stop offset="1" stopColor="#FFB020" />
          </linearGradient>
          <filter id="golem_glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.55 0"
              result="glow"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M32 6C17.64 6 6 17.64 6 32s11.64 26 26 26c7.58 0 14.4-3.22 19.16-8.36l-6.46-3.78A18 18 0 1 1 50 32c0 1.62-.22 3.2-.64 4.7l6.54 3.83C57.24 37.98 58 35.06 58 32 58 17.64 46.36 6 32 6Z"
          fill="url(#golem_g)"
          filter="url(#golem_glow)"
        />
        <path
          d="M36.6 22.2c-2.15-1.2-4.7-1.88-7.4-1.88-8.28 0-15 6.72-15 15s6.72 15 15 15c2.86 0 5.53-.8 7.8-2.18l-3.25-1.92a10.7 10.7 0 0 1-4.55 1.02c-5.88 0-10.65-4.77-10.65-10.65S23.12 24.96 29 24.96c1.57 0 3.06.34 4.4.95l3.2-1.71Z"
          fill="#050814"
          opacity="0.92"
        />
        <circle cx="46.5" cy="32" r="3.3" fill="#050814" opacity="0.9" />
      </svg>

      {withWordmark ? (
        <span style={{fontWeight: 850, letterSpacing: '-0.02em'}}>
          Golem
        </span>
      ) : null}
    </span>
  );
}

