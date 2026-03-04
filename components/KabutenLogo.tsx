// KabutenLogo — SVG wordmark with animated navy→gold shimmer gradient
// Nunito 900 loaded globally via globals.css Google Fonts import.
// No text-shadow, stroke, reflection, or IBM Plex Mono.

interface KabutenLogoProps {
  /** full = 598px (password gate) | small = 380px (above coverage table) */
  size?: 'full' | 'small';
}

export default function KabutenLogo({ size = 'small' }: KabutenLogoProps) {
  const isFull = size === 'full';

  const w           = isFull ? 598 : 380;
  const h           = isFull ? 110 : 70;
  const fontSize    = isFull ? 92  : 58;
  const ls          = isFull ? 8   : 5;
  const textY       = isFull ? 90  : 56;

  // Gradient slides from left→right over 4 s.
  // The gradient window is 1× SVG width; start hidden left, end hidden right.
  const gId = `kg${isFull ? 'f' : 's'}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="KABUTEN"
      style={{ display: 'block' }}
    >
      <defs>
        {/*
          6-stop gradient cycling navy #2B3A67 ↔ gold #C5993A.
          gradientUnits="userSpaceOnUse" lets us animate x1/x2 in px,
          sliding the pattern across the letterforms.
        */}
        <linearGradient
          id={gId}
          gradientUnits="userSpaceOnUse"
          x1={String(-w)}
          y1="0"
          x2="0"
          y2="0"
        >
          <stop offset="0%"    stopColor="#2B3A67" />
          <stop offset="20%"   stopColor="#C5993A" />
          <stop offset="40%"   stopColor="#2B3A67" />
          <stop offset="60%"   stopColor="#C5993A" />
          <stop offset="80%"   stopColor="#2B3A67" />
          <stop offset="100%"  stopColor="#C5993A" />

          {/* Slide x1: −w → +w */}
          <animate
            attributeName="x1"
            values={`${-w};${w}`}
            dur="4s"
            repeatCount="indefinite"
          />
          {/* Slide x2: 0 → 2w  (keeps gradient width = w at all times) */}
          <animate
            attributeName="x2"
            values={`0;${w * 2}`}
            dur="4s"
            repeatCount="indefinite"
          />
        </linearGradient>
      </defs>

      <text
        x="50%"
        y={textY}
        textAnchor="middle"
        fontFamily="Nunito, sans-serif"
        fontWeight="900"
        fontSize={fontSize}
        letterSpacing={ls}
        fill={`url(#${gId})`}
      >
        KABUTEN
      </text>
    </svg>
  );
}
