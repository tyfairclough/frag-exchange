import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { publishImportJobCandidates } from "@/lib/inventory-import";
import { canUseBulkItemFetch } from "@/lib/posting-role";

export async function POST(_: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const user = await requireUser();
  if (!canUseBulkItemFetch(user)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { jobId } = await ctx.params;
  try {
    const result = await publishImportJobCandidates({ userId: user.id, jobId });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to publish import candidates.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
