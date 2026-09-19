import type { NextConfig } from "next";

// /_next/static assets are content-hashed and already served with
// Cache-Control: public, max-age=31536000, immutable by Next's default
// static file handling — no custom cache headers needed here.
const nextConfig: NextConfig = {
  // /client/onboarding was the login-gated route before onboarding became
  // the public, no-login /onboarding flow — anyone who bookmarked or was
  // sent the old link lands on the current one instead of a 404.
  async redirects() {
    return [
      { source: "/client/onboarding", destination: "/onboarding", permanent: true },
      { source: "/client", destination: "/onboarding", permanent: true },
    ];
  },
  // Stage 1 Phase 27 — baseline security headers, applied site-wide.
  // Deliberately the safe, non-breaking subset (no CSP): this app loads
  // Google Fonts, GSAP, and Cloudinary-hosted images/assets, and a CSP
  // tight enough to matter would need careful per-source allowlisting
  // this hardening pass isn't the place to get wrong and accidentally
  // break the live client portal.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
