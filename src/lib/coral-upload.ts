import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  INVENTORY_IMAGE_MAX_EDGE,
  INVENTORY_IMAGE_WEBP_QUALITY,
} from "@/lib/inventory-image-spec";
import { getUploadsDiskPath, isHostedOnUploadsCdn, toUploadsPublicUrl } from "@/lib/uploads-storage";

export const CORAL_UPLOAD_MAX_BYTES = 6 * 1024 * 1024;

export const CORAL_UPLOAD_ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export class CoralImageProcessingError extends Error {
  constructor() {
    super("Could not process image");
    this.name = "CoralImageProcessingError";
  }
}

/** EXIF-aware rotate, resize to max long edge, encode WebP. */
export async function normalizeInventoryImageBuffer(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .rotate()
      .resize({
        width: INVENTORY_IMAGE_MAX_EDGE,
        height: INVENTORY_IMAGE_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: INVENTORY_IMAGE_WEBP_QUALITY })
      .toBuffer();
  } catch {
    throw new CoralImageProcessingError();
  }
}

const REMOTE_IMAGE_FETCH_MS = 20_000;

/** Fetch a remote image (http/https) and return bytes, size-capped. */
export async function fetchRemoteImageBufferForInventory(url: string): Promise<Buffer> {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("Invalid image URL");
  }
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REMOTE_IMAGE_FETCH_MS);
  try {
    const res = await fetch(trimmed, {
      signal: controller.signal,
      headers: {
        "User-Agent": "REEFxCHANGE/1.0 (+https://reefx.net)",
        Accept: "image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const ab = await res.arrayBuffer();
    if (ab.byteLength > CORAL_UPLOAD_MAX_BYTES) {
      throw new Error("Image too large");
    }
    if (ab.byteLength === 0) {
      throw new Error("Empty image");
    }
    return Buffer.from(ab);
  } finally {
    clearTimeout(t);
  }
}

/** Normalize arbitrary image bytes and write WebP under coral-uploads (no MIME pre-check; sharp validates). */
export async function saveFetchedImageBufferToPublic(params: { userId: string; buffer: Buffer }): Promise<string> {
  const out = await normalizeInventoryImageBuffer(params.buffer);
  const id = crypto.randomUUID();
  const fileName = `${id}.webp`;
  const uploadsDir = getUploadsDiskPath("coral-uploads", params.userId);
  await mkdir(uploadsDir, { recursive: true });
  const diskPath = path.join(uploadsDir, fileName);
  await writeFile(diskPath, out);
  return toUploadsPublicUrl("coral-uploads", params.userId, fileName);
}

/**
 * If `imageUrl` is a remote http(s) URL not already on our uploads CDN, fetch it and store a local WebP copy.
 * On failure, returns the original URL so publishing can still proceed.
 */
export async function mirrorHttpImageUrlToUploads(params: { userId: string; imageUrl: string | null }): Promise<string | null> {
  const raw = params.imageUrl?.trim() ?? "";
  if (!raw) {
    return null;
  }
  if (!/^https?:\/\//i.test(raw) || isHostedOnUploadsCdn(raw)) {
    return raw;
  }
  try {
    const buffer = await fetchRemoteImageBufferForInventory(raw);
    return await saveFetchedImageBufferToPublic({ userId: params.userId, buffer });
  } catch {
    return raw;
  }
}

export async function saveCoralImageToPublic(params: {
  userId: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<string> {
  if (!validateImageMime(params.mimeType)) {
    throw new Error("Unsupported image type");
  }

  const out = await normalizeInventoryImageBuffer(params.buffer);

  const id = crypto.randomUUID();
  const fileName = `${id}.webp`;
  const uploadsDir = getUploadsDiskPath("coral-uploads", params.userId);
  await mkdir(uploadsDir, { recursive: true });

  const diskPath = path.join(uploadsDir, fileName);
  await writeFile(diskPath, out);

  return toUploadsPublicUrl("coral-uploads", params.userId, fileName);
}

export function validateImageMime(mime: string): boolean {
  return CORAL_UPLOAD_ALLOWED_MIME.has(mime);
}
