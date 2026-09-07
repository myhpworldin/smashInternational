const GRAIN_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>" +
  "<filter id='grain'>" +
  "<feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch' />" +
  "<feColorMatrix type='saturate' values='0' />" +
  "</filter>" +
  "<rect width='100%' height='100%' filter='url(#grain)' />" +
  "</svg>";

export default function Grain() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 opacity-[0.035] [mix-blend-mode:overlay]"
      style={{
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}")`,
      }}
    />
  );
}
