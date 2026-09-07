export default function Seam() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        <linearGradient id="seam-gradient" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--color-smash)" />
          <stop offset="100%" stopColor="var(--color-smash-dim)" />
        </linearGradient>
      </defs>
      <path
        id="seam-path-desktop"
        className="hidden opacity-0 [will-change:stroke-dashoffset] md:block"
        d="M1440,0 L1180,150 L1320,240 L960,430 L1100,520 L620,700 L800,780 L180,900"
        stroke="url(#seam-gradient)"
        strokeWidth="1.5"
      />
      <path
        id="seam-path-mobile"
        className="opacity-0 [will-change:stroke-dashoffset] md:hidden"
        d="M1440,0 L1360,140 L1420,260 L1300,430 L1380,560 L1200,750 L1280,850 L1100,900"
        stroke="url(#seam-gradient)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
