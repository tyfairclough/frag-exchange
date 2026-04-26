import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getUploadsDiskPath, toUploadsPublicUrl } from "@/lib/uploads-storage";

export const AVATAR_UPLOAD_MAX_BYTES = 6 * 1024 * 1024;

export const AVATAR_ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function isAllowedMime(mime: string): boolean {
  return AVATAR_ALLOWED_MIME.has(mime);
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

export async function saveUserAvatarToPublic(params: {
  userId: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<{
  avatar40Url: string;
  avatar80Url: string;
  avatar256Url: string;
  avatarUpdatedAt: Date;
}> {
  if (!isAllowedMime(params.mimeType)) {
    throw new Error("Unsupported image type");
  }

  const id = crypto.randomUUID();
  const uploadsDir = getUploadsDiskPath("avatars", params.userId);
  await mkdir(uploadsDir, { recursive: true });

  const file40 = `${id}-40.webp`;
  const file80 = `${id}-80.webp`;
  const file256 = `${id}-256.webp`;

  await Promise.all([
    writeWebpVariant({ outputPath: path.join(uploadsDir, file40), source: params.buffer, size: 40 }),
    writeWebpVariant({ outputPath: path.join(uploadsDir, file80), source: params.buffer, size: 80 }),
    writeWebpVariant({ outputPath: path.join(uploadsDir, file256), source: params.buffer, size: 256 }),
  ]);

  const avatarUpdatedAt = new Date();
  return {
    avatar40Url: toUploadsPublicUrl("avatars", params.userId, file40),
    avatar80Url: toUploadsPublicUrl("avatars", params.userId, file80),
    avatar256Url: toUploadsPublicUrl("avatars", params.userId, file256),
    avatarUpdatedAt,
  };
}

export function validateAvatarUpload(file: File): string | null {
  if (!file || file.size <= 0) {
    return "Upload an image.";
  }
  if (file.size > AVATAR_UPLOAD_MAX_BYTES) {
    return "Image must be 6MB or smaller.";
  }
  if (!isAllowedMime(file.type)) {
    return "Use JPG, PNG, or WebP.";
  }
  return null;
}
