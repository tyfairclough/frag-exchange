import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PostSaveItemListings } from "@/components/post-save-item-listings";
import { BackLink } from "@/components/back-link";

type Props = { params: Promise<{ id: string }> };

export default async function ListNewItemOnExchangesPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;

  const [item, memberships] = await Promise.all([
    getPrisma().inventoryItem.findFirst({
      where: { id, userId: user.id },
    }),
    getPrisma().exchangeMembership.findMany({
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
    }),
  ]);

  if (!item) {
    notFound();
  }

  const now = new Date();
  const activeListings = await getPrisma().exchangeListing.findMany({
    where: {
      inventoryItemId: id,
      expiresAt: { gt: now },
    },
    select: { exchangeId: true },
  });
  const listedExchangeIds = activeListings.map((r) => r.exchangeId);

  const exchangesForListings = memberships.map((m) => m.exchange);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/my-items" className="link link-hover text-base-content/70">
          My items
        </Link>
        <span className="text-base-content/40" aria-hidden>
          /
        </span>
        <span className="text-base-content/80">New item</span>
      </div>

      {exchangesForListings.length === 0 ? (
        <section className="card border border-base-content/10 bg-base-200/45 shadow-sm">
          <div className="card-body gap-3 p-5 text-sm text-base-content/80">
            <p>You&apos;re not in any exchanges yet. Join one to list items there.</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/exchanges" className="btn btn-primary btn-sm min-h-10 rounded-xl">
                Browse exchanges
              </Link>
              <BackLink href="/my-items" className="min-h-10">
                Back to My items
              </BackLink>
            </div>
          </div>
        </section>
      ) : item.remainingQuantity <= 0 ? (
        <p className="text-sm text-base-content/70">
          This item has no quantity left to list.{" "}
          <BackLink href="/my-items" variant="text" className="link link-primary">
            Back to My items
          </BackLink>
        </p>
      ) : (
        <PostSaveItemListings
          itemId={item.id}
          itemKind={item.kind}
          listingIntent={item.listingIntent}
          remainingQuantity={item.remainingQuantity}
          exchanges={exchangesForListings}
          listedExchangeIds={listedExchangeIds}
        />
      )}
    </div>
  );
}
