import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
