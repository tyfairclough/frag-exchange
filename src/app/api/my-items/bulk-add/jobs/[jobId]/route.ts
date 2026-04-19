import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { canUseBulkItemFetch } from "@/lib/posting-role";
import { runInventoryImportJobById } from "@/lib/inventory-import";

export async function GET(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const user = await requireUser();
  if (!canUseBulkItemFetch(user)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { jobId } = await ctx.params;
  const url = new URL(req.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "80");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 300) : 80;
  const before = url.searchParams.get("before");
  const job = await getPrisma().inventoryImportJob.findFirst({
    where: { id: jobId, userId: user.id },
    include: {
      candidates: {
        orderBy: { createdAt: "asc" },
      },
      events: {
        where: before ? { createdAt: { lt: new Date(before) } } : undefined,
        orderBy: { createdAt: "desc" },
        take: limit,
      },
    },
  });
  if (!job) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (job.status === "QUEUED") {
    void runInventoryImportJobById(job.id);
  }
  return NextResponse.json({
    ok: true,
    job: {
      ...job,
      events: [...job.events].reverse(),
    },
  });
}
