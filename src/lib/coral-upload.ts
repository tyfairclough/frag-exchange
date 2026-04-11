import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  INVENTORY_IMAGE_MAX_EDGE,
  INVENTORY_IMAGE_WEBP_QUALITY,
} from "@/lib/inventory-image-spec";

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
  const publicDir = path.join(process.cwd(), "public", "coral-uploads", params.userId);
  await mkdir(publicDir, { recursive: true });

  const diskPath = path.join(publicDir, fileName);
  await writeFile(diskPath, out);

  return `/${path.posix.join("coral-uploads", params.userId, fileName)}`;
}

export function validateImageMime(mime: string): boolean {
  return CORAL_UPLOAD_ALLOWED_MIME.has(mime);
}
