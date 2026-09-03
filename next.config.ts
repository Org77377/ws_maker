import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Playwright ships native binaries; keep it external so Next does not bundle it.
  serverExternalPackages: ["playwright"],
  allowedDevOrigins: ["*.space-z.ai"],
};

export default nextConfig;
