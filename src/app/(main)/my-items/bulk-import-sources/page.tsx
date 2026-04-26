import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canUseBulkItemFetch } from "@/lib/posting-role";
import { getPrisma } from "@/lib/db";
import { BackLink } from "@/components/back-link";
import { BulkImportSourcesManager } from "@/components/bulk-import-sources-manager";

export default async function BulkImportSourcesPage() {
  const user = await requireUser();
  if (!canUseBulkItemFetch(user)) {
    redirect("/my-items");
  }
  const memberships = await getPrisma().exchangeMembership.findMany({
    where: { userId: user.id },
    include: {
      exchange: {
        select: {
          id: true,
          name: true,
          allowCoral: true,
          allowFish: true,
          allowEquipment: true,
          allowItemsForSale: true,
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
      <BackLink href="/my-items">Back to My items</BackLink>
      <div>
        <h1 className="text-xl font-semibold text-base-content">Bulk import sources</h1>
        <p className="mt-1 text-sm text-base-content/70">
          Manage catalog URLs, defaults, and optional weekly rescans. Each source keeps its own crawl and refresh schedule.
        </p>
      </div>
      <BulkImportSourcesManager exchanges={memberships.map((m) => m.exchange)} />
      <p className="text-xs text-base-content/60">
        Prefer the step-by-step flow?{" "}
        <Link href="/my-items/bulk-add" className="link link-primary">
          Classic bulk add
        </Link>
      </p>
    </div>
  );
}
