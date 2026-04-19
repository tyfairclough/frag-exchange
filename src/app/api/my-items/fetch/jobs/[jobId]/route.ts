import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { canUseBulkItemFetch } from "@/lib/posting-role";

export async function GET(_: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const user = await requireUser();
  if (!canUseBulkItemFetch(user)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { jobId } = await ctx.params;
  const job = await getPrisma().inventoryImportJob.findFirst({
    where: { id: jobId, userId: user.id },
    include: {
      candidates: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!job) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, job });
}
