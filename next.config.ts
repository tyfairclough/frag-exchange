import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const turbopackProjectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: turbopackProjectRoot,
  },
  experimental: {
    serverActions: {
      // Default is 1 MB; coral uploads allow 6 MB binary, and vision uses base64 (~4/3 larger).
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
