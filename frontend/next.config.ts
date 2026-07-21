import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  outputFileTracingRoot: process.cwd(),
  outputFileTracingExcludes: {
    "*": [
      "./src/**/*.test.ts",
      "./src/**/*.test.tsx",
      "./docs/**/*",
      "./coverage/**/*",
    ],
  },
};

export default nextConfig;
