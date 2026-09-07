import type { NextConfig } from "next";

// /_next/static assets are content-hashed and already served with
// Cache-Control: public, max-age=31536000, immutable by Next's default
// static file handling — no custom headers() needed here.
const nextConfig: NextConfig = {};

export default nextConfig;
