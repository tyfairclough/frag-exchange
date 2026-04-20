import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { publishImportJobCandidates } from "@/lib/inventory-import";
import { canUseBulkItemFetch } from "@/lib/posting-role";

export async function POST(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const user = await requireUser();
  if (!canUseBulkItemFetch(user)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { jobId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { candidateIds?: unknown } | null;
  let candidateIds: string[] | undefined;
  if (body && Array.isArray(body.candidateIds)) {
    candidateIds = [
      ...new Set(body.candidateIds.filter((id): id is string => typeof id === "string" && id.length > 0)),
    ];
    if (candidateIds.length === 0) {
      return NextResponse.json({ ok: false, error: "no_candidates" }, { status: 400 });
    }
  }
  try {
    const result = await publishImportJobCandidates({ userId: user.id, jobId, candidateIds });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to publish import candidates.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
