import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { CORAL_UPLOAD_MAX_BYTES, saveCoralImageToPublic, validateImageMime } from "@/lib/coral-upload";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const imageFile = formData.get("imageFile");
  if (!imageFile || typeof imageFile !== "object" || !("arrayBuffer" in imageFile) || !("size" in imageFile)) {
    return NextResponse.json({ error: "missing-file" }, { status: 400 });
  }

  const file = imageFile as File;
  if (file.size <= 0) {
    return NextResponse.json({ error: "empty-file" }, { status: 400 });
  }
  if (file.size > CORAL_UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: "image-too-large" }, { status: 400 });
  }

  const mime = (file.type || "").trim().toLowerCase();
  if (!validateImageMime(mime)) {
    return NextResponse.json({ error: "invalid-image-type" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const imageUrl = await saveCoralImageToPublic({
    userId: user.id,
    buffer,
    mimeType: mime,
  });

  return NextResponse.json({ imageUrl });
}
