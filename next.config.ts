import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1 MB; coral uploads allow 6 MB binary, and vision uses base64 (~4/3 larger).
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
