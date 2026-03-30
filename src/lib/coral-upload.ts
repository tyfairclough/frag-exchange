import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const CORAL_UPLOAD_MAX_BYTES = 6 * 1024 * 1024;

export const CORAL_UPLOAD_ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export function extensionForMime(mime: string): string | null {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return null;
}

export async function saveCoralImageToPublic(params: {
  userId: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<string> {
  const ext = extensionForMime(params.mimeType);
  if (!ext) {
    throw new Error("Unsupported image type");
  }

  const id = crypto.randomUUID();
  const fileName = `${id}.${ext}`;
  const publicDir = path.join(process.cwd(), "public", "coral-uploads", params.userId);
  await mkdir(publicDir, { recursive: true });

  const diskPath = path.join(publicDir, fileName);
  await writeFile(diskPath, params.buffer);

  return `/${path.posix.join("coral-uploads", params.userId, fileName)}`;
}

export function validateImageMime(mime: string): boolean {
  return CORAL_UPLOAD_ALLOWED_MIME.has(mime);
}
