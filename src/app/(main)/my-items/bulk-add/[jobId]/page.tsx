import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { canUseBulkItemFetch } from "@/lib/posting-role";
import { DismissibleFetchImportNotice } from "@/components/dismissible-fetch-import-notice";
import { FetchItemsReviewTable } from "@/components/fetch-items-review-table";
import { PublishFetchJobButton } from "@/components/publish-fetch-job-button";

export default async function FetchItemsReviewPage({ params }: { params: Promise<{ jobId: string }> }) {
  const user = await requireUser();
  if (!canUseBulkItemFetch(user)) {
    redirect("/my-items");
  }
  const { jobId } = await params;
  const [job, memberships] = await Promise.all([
    getPrisma().inventoryImportJob.findFirst({
      where: { id: jobId, userId: user.id },
      include: {
        candidates: { orderBy: { createdAt: "asc" } },
        events: { orderBy: { createdAt: "desc" }, take: 120 },
      },
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
    redirect("/my-items/bulk-add");
  }
  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 pb-6">
        <Link href="/my-items" className="btn btn-ghost btn-sm mr-4 mt-6 w-fit rounded-xl">
          Back to My items
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-base-content">Review items to add</h1>
            <p className="mt-1 text-sm text-base-content/70">Source: {job.sourceUrl}</p>
          </div>
          <PublishFetchJobButton jobId={job.id} />
        </div>
        <DismissibleFetchImportNotice />
        <FetchItemsReviewTable
          initialJob={{
            id: job.id,
            status: job.status,
            pagesVisited: job.pagesVisited,
            pagesParsed: job.pagesParsed,
            detailUrlsDiscovered: job.detailUrlsDiscovered,
            detailUrlsProcessed: job.detailUrlsProcessed,
            candidatesReady: job.candidatesReady,
            candidatesFailed: job.candidatesFailed,
            events: [...job.events].reverse().map((e) => ({
              id: e.id,
              level: e.level,
              stage: e.stage,
              message: e.message,
              createdAt: e.createdAt.toISOString(),
            })),
            candidates: job.candidates.map((c) => ({
              id: c.id,
              kind: c.kind,
              name: c.name,
              description: c.description,
              coralType: c.coralType,
              species: c.species,
              reefSafe: c.reefSafe,
              quantity: c.quantity,
              salePriceMinor: c.salePriceMinor,
              saleCurrencyCode: c.saleCurrencyCode,
              saleExternalUrl: c.saleExternalUrl,
              selectedExchangeIds: c.selectedExchangeIds,
              confidenceScore: c.confidenceScore,
              sourcePageUrl: c.sourcePageUrl,
              imageUrl: c.imageUrl,
              rejectedAt: c.rejectedAt?.toISOString() ?? null,
              createdItemId: c.createdItemId,
            })),
          }}
          exchanges={memberships.map((m) => m.exchange)}
        />
      </div>
    </>
  );
}
