import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { startInteractiveImportForSource } from "@/lib/bulk-import-source-service";
import { canUseBulkItemFetch } from "@/lib/posting-role";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canUseBulkItemFetch(user)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    const { jobId } = await startInteractiveImportForSource(user.id, id);
    return NextResponse.json({ ok: true, jobId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not start import.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
