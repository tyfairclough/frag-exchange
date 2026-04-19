import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { canUseBulkItemFetch } from "@/lib/posting-role";

export async function DELETE(_: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const user = await requireUser();
  if (!canUseBulkItemFetch(user)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { jobId } = await ctx.params;
  const job = await getPrisma().inventoryImportJob.findFirst({
    where: { id: jobId, userId: user.id },
    select: { id: true },
  });
  if (!job) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const deleted = await getPrisma().$transaction(async (tx) => {
    const r = await tx.inventoryImportCandidate.deleteMany({ where: { jobId, userId: user.id } });
    await tx.inventoryImportJob.update({
      where: { id: jobId },
      data: { candidatesFound: 0, candidatesReady: 0, candidatesFailed: 0 },
    });
    return r;
  });

  return NextResponse.json({ ok: true, deletedCount: deleted.count });
}
