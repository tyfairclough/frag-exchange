import {
  INVENTORY_IMAGE_MAX_EDGE,
  INVENTORY_IMAGE_WEBP_QUALITY_CLIENT,
} from "@/lib/inventory-image-spec";

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Strip path and extension from a filename for a safe upload basename. */
function baseNameWithoutExtension(originalName: string): string {
  const leaf = originalName.replace(/^.*[/\\]/, "");
  return leaf.replace(/\.[^.]+$/, "") || "photo";
}

function extensionForMime(mime: string): string {
  return mime === "image/webp" ? ".webp" : ".jpg";
}

/**
 * Downscale and encode (WebP preferred, JPEG fallback). Browser-only.
 * Shared by vision JSON and multipart uploads.
 */
export async function resizeInventoryImageToBlob(file: File): Promise<{ blob: Blob; mimeType: string }> {
  const bitmap = await createImageBitmap(file);
  try {
    const w = bitmap.width;
    const h = bitmap.height;
    const long = Math.max(w, h);
    const scale = long > INVENTORY_IMAGE_MAX_EDGE ? INVENTORY_IMAGE_MAX_EDGE / long : 1;
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas not supported");
    }
    ctx.drawImage(bitmap, 0, 0, cw, ch);

    const mimeWebp = "image/webp";
    const blobWebp = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), mimeWebp, INVENTORY_IMAGE_WEBP_QUALITY_CLIENT);
    });

    if (blobWebp && blobWebp.size > 0) {
      return { blob: blobWebp, mimeType: mimeWebp };
    }

    const mimeJpeg = "image/jpeg";
    const blobJpeg = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), mimeJpeg, INVENTORY_IMAGE_WEBP_QUALITY_CLIENT);
    });
    if (!blobJpeg || blobJpeg.size === 0) {
      throw new Error("Could not encode image");
    }
    return { blob: blobJpeg, mimeType: mimeJpeg };
  } finally {
    bitmap.close();
  }
}

/**
 * Downscale and encode before sending vision JSON — keeps request payload small.
 * Must only run in the browser (uses Canvas).
 */
export async function prepareInventoryVisionImage(
  file: File,
): Promise<{ imageBase64: string; mimeType: string }> {
  const { blob, mimeType } = await resizeInventoryImageToBlob(file);
  const buf = await blob.arrayBuffer();
  return { imageBase64: arrayBufferToBase64(buf), mimeType };
}

/**
 * Same pixel dimensions and encoding as vision — use for upload-image API routes and server actions
 * so large camera originals stay under the multipart size limit before server-side sharp.
 */
export async function prepareInventoryImageForUpload(file: File): Promise<File> {
  const { blob, mimeType } = await resizeInventoryImageToBlob(file);
  const base = baseNameWithoutExtension(file.name);
  const fileName = base + extensionForMime(mimeType);
  return new File([blob], fileName, { type: mimeType });
}

/**
 * If `fd` contains a non-empty `imageFile`, replace it with a vision-sized encoded file.
 */
export async function replaceFormDataImageFileWithNormalized(fd: FormData): Promise<void> {
  const img = fd.get("imageFile");
  if (img instanceof File && img.size > 0) {
    const normalized = await prepareInventoryImageForUpload(img);
    fd.set("imageFile", normalized);
  }
}
