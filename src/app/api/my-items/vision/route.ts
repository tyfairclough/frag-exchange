import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { enrichInventoryFromImage } from "@/lib/coral-ai";
import { CORAL_UPLOAD_MAX_BYTES, validateImageMime } from "@/lib/coral-upload";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const { imageBase64: rawB64, mimeType: rawMime } = body as {
    imageBase64?: unknown;
    mimeType?: unknown;
  };
  const imageBase64 = typeof rawB64 === "string" ? rawB64.trim() : "";
  const mimeType = typeof rawMime === "string" ? rawMime.trim().toLowerCase() : "";

  if (!validateImageMime(mimeType)) {
    return NextResponse.json({ error: "invalid-image-type" }, { status: 400 });
  }

  const buf = Buffer.from(imageBase64, "base64");
  if (!buf.length || buf.length > CORAL_UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: "image-too-large" }, { status: 400 });
  }

  try {
    const result = await enrichInventoryFromImage({ imageBase64, mimeType });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "enrichment-failed" }, { status: 500 });
  }
}
