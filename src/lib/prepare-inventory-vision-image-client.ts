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

/**
 * Downscale and encode before sending vision JSON — keeps request payload small.
 * Must only run in the browser (uses Canvas).
 */
export async function prepareInventoryVisionImage(
  file: File,
): Promise<{ imageBase64: string; mimeType: string }> {
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
      const buf = await blobWebp.arrayBuffer();
      return { imageBase64: arrayBufferToBase64(buf), mimeType: mimeWebp };
    }

    const mimeJpeg = "image/jpeg";
    const blobJpeg = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), mimeJpeg, INVENTORY_IMAGE_WEBP_QUALITY_CLIENT);
    });
    if (!blobJpeg || blobJpeg.size === 0) {
      throw new Error("Could not encode image");
    }
    const buf = await blobJpeg.arrayBuffer();
    return { imageBase64: arrayBufferToBase64(buf), mimeType: mimeJpeg };
  } finally {
    bitmap.close();
  }
}
