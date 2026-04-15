import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const turbopackProjectRoot = path.dirname(fileURLToPath(import.meta.url));
const uploadsBaseUrl = process.env.UPLOADS_PUBLIC_BASE_URL || "https://uploads.reefx.net";
let uploadsHostname = "uploads.reefx.net";
try {
  uploadsHostname = new URL(uploadsBaseUrl).hostname || uploadsHostname;
} catch {
  // Invalid env should not block startup; fallback host stays allowlisted.
}

const nextConfig: NextConfig = {
  turbopack: {
    root: turbopackProjectRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: uploadsHostname,
      },
    ],
  },
  experimental: {
    serverActions: {
      // Default is 1 MB; coral uploads allow 6 MB binary, and vision uses base64 (~4/3 larger).
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
