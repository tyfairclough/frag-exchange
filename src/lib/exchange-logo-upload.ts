import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getUploadsDiskPath, toUploadsPublicUrl } from "@/lib/uploads-storage";

export const EXCHANGE_LOGO_UPLOAD_MAX_BYTES = 6 * 1024 * 1024;

export const EXCHANGE_LOGO_ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function isAllowedMime(mime: string): boolean {
  return EXCHANGE_LOGO_ALLOWED_MIME.has(mime);
}

async function writeWebpVariant(params: {
  outputPath: string;
  source: Buffer;
  size: number;
}) {
  const out = await sharp(params.source)
    .resize(params.size, params.size, { fit: "cover", position: "centre" })
    .webp({ quality: 90 })
    .toBuffer();
  await writeFile(params.outputPath, out);
}

export async function saveExchangeLogoToPublic(params: {
  exchangeId: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<{
  logo40Url: string;
  logo80Url: string;
  logo512Url: string;
  logoUpdatedAt: Date;
}> {
  if (!isAllowedMime(params.mimeType)) {
    throw new Error("Unsupported image type");
  }

  const id = crypto.randomUUID();
  const uploadsDir = getUploadsDiskPath("exchange-logos", params.exchangeId);
  await mkdir(uploadsDir, { recursive: true });

  const file40 = `${id}-40.webp`;
  const file80 = `${id}-80.webp`;
  /** Stored in DB as `logo512Url`; file is 1024px for sharper large surfaces. */
  const file1024 = `${id}-1024.webp`;

  await Promise.all([
    writeWebpVariant({ outputPath: path.join(uploadsDir, file40), source: params.buffer, size: 40 }),
    writeWebpVariant({ outputPath: path.join(uploadsDir, file80), source: params.buffer, size: 80 }),
    writeWebpVariant({ outputPath: path.join(uploadsDir, file1024), source: params.buffer, size: 1024 }),
  ]);

  const logoUpdatedAt = new Date();
  return {
    logo40Url: toUploadsPublicUrl("exchange-logos", params.exchangeId, file40),
    logo80Url: toUploadsPublicUrl("exchange-logos", params.exchangeId, file80),
    logo512Url: toUploadsPublicUrl("exchange-logos", params.exchangeId, file1024),
    logoUpdatedAt,
  };
}

export function validateExchangeLogoUpload(file: File): string | null {
  if (!file || file.size <= 0) {
    return "Upload an image.";
  }
  if (file.size > EXCHANGE_LOGO_UPLOAD_MAX_BYTES) {
    return "Image must be 6MB or smaller.";
  }
  if (!isAllowedMime(file.type)) {
    return "Use JPG, PNG, or WebP.";
  }
  return null;
}
