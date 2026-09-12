import type { NextConfig } from "next";

// /_next/static assets are content-hashed and already served with
// Cache-Control: public, max-age=31536000, immutable by Next's default
// static file handling — no custom headers() needed here.
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
};

export default nextConfig;
