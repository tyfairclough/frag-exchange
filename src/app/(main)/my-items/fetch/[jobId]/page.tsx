import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { canUseBulkItemFetch } from "@/lib/posting-role";
import { FetchItemsReviewTable } from "@/components/fetch-items-review-table";

export default async function FetchItemsReviewPage({ params }: { params: Promise<{ jobId: string }> }) {
  const user = await requireUser();
  if (!canUseBulkItemFetch(user)) {
    redirect("/my-items");
  }
  const { jobId } = await params;
  const [job, memberships] = await Promise.all([
    getPrisma().inventoryImportJob.findFirst({
      where: { id: jobId, userId: user.id },
      include: { candidates: { orderBy: { createdAt: "asc" } } },
    }),
    getPrisma().exchangeMembership.findMany({
      where: { userId: user.id },
      include: {
        exchange: {
          select: { id: true, name: true, allowCoral: true, allowFish: true, allowEquipment: true, allowItemsForSale: true },
        },
      },
    }),
  ]);
  if (!job) {
    redirect("/my-items/fetch");
  }
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-base-content">Fetched items review</h1>
          <p className="mt-1 text-sm text-base-content/70">Source: {job.sourceUrl}</p>
        </div>
        <Link href="/my-items" className="btn btn-ghost btn-sm rounded-xl">
          Back to My items
        </Link>
      </div>
      <div className="rounded-xl border border-info/30 bg-info/10 p-3 text-sm text-info-content">
        Imports can take a while. You can safely leave this page; we&apos;ll email you when parsing has finished.
      </div>
      <FetchItemsReviewTable
        initialJob={job}
        exchanges={memberships.map((m) => m.exchange)}
      />
    </div>
  );
}
