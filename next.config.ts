import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: "standalone" output is intentionally DISABLED for Vercel. The
  // standalone tracing excludes @sparticuz/chromium's large brotli binary
  // files (bin/*.br), causing "bin does not exist" errors at runtime.
  // Vercel's default builder includes node_modules correctly.
  // output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Playwright/Puppeteer/Sparticuz/Sharp ship native binaries; keep them
  // external so Next.js does not try to bundle them (which breaks the build).
  serverExternalPackages: [
    "playwright",
    "puppeteer-core",
    "@sparticuz/chromium",
    "sharp",
  ],
  allowedDevOrigins: ["*.space-z.ai"],
};

export default nextConfig;
