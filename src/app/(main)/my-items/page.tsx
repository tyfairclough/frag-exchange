import Link from "next/link";
import { CoralProfileStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { DeleteCoralButton } from "@/components/delete-coral-button";
import { InventoryItemCard } from "@/components/inventory-item-card";

export default async function MyItemsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : undefined;

  const items = await getPrisma().inventoryItem.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-base-content">My items</h1>
          <p className="mt-1 text-sm text-base-content/70">
            Manage corals, fish, and equipment you want to swap. List them on exchanges until a trade completes.
          </p>
        </div>
        <Link href="/my-items/new" className="btn btn-primary btn-sm min-h-10 shrink-0 rounded-xl">
          Add item
        </Link>
      </div>

      {error === "not-found" ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">That item was not found.</p>
      ) : null}
      {error === "locked" ? (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-content">
          Traded items cannot be edited or deleted here.
        </p>
      ) : null}

      {items.length === 0 ? (
        <section className="card border border-base-content/10 bg-base-200/45 shadow-sm">
          <div className="card-body p-5 text-sm text-base-content/75">
            <p>No items yet. Add a photo first — we&apos;ll help classify and fill in the details.</p>
            <Link href="/my-items/new" className="btn btn-primary btn-sm mt-3 min-h-10 w-fit rounded-xl">
              Add your first item
            </Link>
          </div>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((c) => (
            <li key={c.id}>
              <InventoryItemCard
                item={c}
                showListingStatusBadge
                actions={
                  c.profileStatus === CoralProfileStatus.UNLISTED ? (
                    <>
                      <Link href={`/my-items/${c.id}/edit`} className="btn btn-outline btn-sm min-h-10 rounded-xl">
                        Edit
                      </Link>
                      <DeleteCoralButton itemId={c.id} />
                    </>
                  ) : (
                    <p className="text-xs text-base-content/60">This item is locked after a completed trade.</p>
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
