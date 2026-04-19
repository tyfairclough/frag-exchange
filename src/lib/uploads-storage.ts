import path from "node:path";

const DEFAULT_UPLOADS_BASE_URL = "https://uploads.reefx.net";

type UploadsStorageConfig = {
  storageRoot: string;
  publicBaseUrl: string;
};

let cachedConfig: UploadsStorageConfig | null = null;

function assertSafeSegment(segment: string): string {
  const trimmed = segment.trim();
  if (!trimmed || trimmed === "." || trimmed === ".." || /[\\/]/.test(trimmed)) {
    throw new Error(`Invalid uploads path segment: "${segment}"`);
  }
  return trimmed;
}

function normalizePublicBaseUrl(value: string): string {
  const input = value.trim() || DEFAULT_UPLOADS_BASE_URL;
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error("UPLOADS_PUBLIC_BASE_URL must be a valid absolute URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("UPLOADS_PUBLIC_BASE_URL must use http or https");
  }
  return parsed.toString().replace(/\/+$/, "");
}

function readUploadsStorageConfig(): UploadsStorageConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const storageRoot = (process.env.UPLOADS_STORAGE_PATH || "").trim();
  if (!storageRoot) {
    throw new Error("UPLOADS_STORAGE_PATH is required for persistent uploads");
  }
  if (!path.isAbsolute(storageRoot)) {
    throw new Error("UPLOADS_STORAGE_PATH must be an absolute filesystem path");
  }

  const publicBaseUrl = normalizePublicBaseUrl(process.env.UPLOADS_PUBLIC_BASE_URL || DEFAULT_UPLOADS_BASE_URL);
  cachedConfig = { storageRoot, publicBaseUrl };
  return cachedConfig;
}

export function getUploadsDiskPath(...segments: string[]): string {
  const { storageRoot } = readUploadsStorageConfig();
  const safeSegments = segments.map(assertSafeSegment);
  return path.join(storageRoot, ...safeSegments);
}

export function toUploadsPublicUrl(...segments: string[]): string {
  const { publicBaseUrl } = readUploadsStorageConfig();
  const encodedPath = segments.map(assertSafeSegment).map(encodeURIComponent).join("/");
  return `${publicBaseUrl}/${encodedPath}`;
}

/** True when `url` is already served from this app's uploads CDN (skip re-downloading). */
export function isHostedOnUploadsCdn(url: string): boolean {
  try {
    const { publicBaseUrl } = readUploadsStorageConfig();
    return url.trimStart().startsWith(publicBaseUrl);
  } catch {
    return false;
  }
}
