import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // Pre-compile these routes on dev server start instead of on first request.
    prerenderEarlyExit: true,
  },
  // Exclude pdf-parse test assets from the bundle to reduce compile time.
  webpack: (config) => {
    config.resolve.alias["canvas"] = false;
    return config;
  },
};

export default nextConfig;
