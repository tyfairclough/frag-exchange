/** Longest edge in pixels (fit inside; no upscaling). Shared by client vision prep and server sharp. */
export const INVENTORY_IMAGE_MAX_EDGE = 1024;

/** sharp `webp({ quality })` range 1–100 */
export const INVENTORY_IMAGE_WEBP_QUALITY = 85;

/** `canvas.toBlob` quality for WebP/JPEG, range 0–1 */
export const INVENTORY_IMAGE_WEBP_QUALITY_CLIENT = INVENTORY_IMAGE_WEBP_QUALITY / 100;
