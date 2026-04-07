import Link from "next/link";
import { notFound } from "next/navigation";
import { CoralProfileStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canViewExchangeDirectory } from "@/lib/super-admin";
import { submitTradeInitiationAction } from "@/app/(main)/exchanges/trade-actions";

const tradeErrors: Record<string, string> = {
  selection: "Pick at least one of your corals and one of theirs.",
  self: "You cannot trade with yourself.",
  membership: "Both people must be members of this exchange.",
  coral: "One or more corals are not available.",
  listing: "Those corals are not actively listed on this exchange.",
};

export default async function ExchangeTradeInitiationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ with?: string; focus?: string; error?: string }>;
}) {
  const viewer = await requireUser();
  const { id: exchangeId } = await params;
  const sp = await searchParams;
  const peerUserId = sp.with?.trim();
  const focusItemId = sp.focus?.trim();

  if (!peerUserId) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
        <Link href={`/explore?exchangeId=${encodeURIComponent(exchangeId)}`} className="btn btn-ghost btn-sm min-h-10 w-fit rounded-xl">
          Back to explore
        </Link>
        <p className="text-sm text-base-content/70">Open this page from a listing or member profile to choose a trade partner.</p>
      </div>
    );
  }

  const exchange = await getPrisma().exchange.findUnique({
    where: { id: exchangeId },
    include: {
      memberships: {
        where: { userId: { in: [viewer.id, peerUserId] } },
      },
    },
  });

  if (!exchange) {
    notFound();
  }

  const viewerMembership = exchange.memberships.find((m) => m.userId === viewer.id) ?? null;
  const peerMembership = exchange.memberships.find((m) => m.userId === peerUserId) ?? null;

  if (!canViewExchangeDirectory(exchange, viewerMembership, viewer) || !viewerMembership || !peerMembership) {
    notFound();
  }

  const peer = await getPrisma().user.findUnique({
    where: { id: peerUserId },
    select: { id: true, alias: true, avatarEmoji: true },
  });

  if (!peer) {
    notFound();
  }

  const now = new Date();

  const [myRows, theirRows] = await Promise.all([
    getPrisma().exchangeListing.findMany({
      where: {
        exchangeId,
        expiresAt: { gt: now },
        inventoryItem: { userId: viewer.id, profileStatus: CoralProfileStatus.UNLISTED },
      },
      include: { inventoryItem: true },
      orderBy: { listedAt: "desc" },
    }),
    getPrisma().exchangeListing.findMany({
      where: {
        exchangeId,
        expiresAt: { gt: now },
        inventoryItem: { userId: peerUserId, profileStatus: CoralProfileStatus.UNLISTED },
      },
      include: { inventoryItem: true },
      orderBy: { listedAt: "desc" },
    }),
  ]);

  const err = sp.error ? tradeErrors[sp.error] ?? "Something went wrong." : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <Link href={`/explore?exchangeId=${encodeURIComponent(exchangeId)}`} className="btn btn-ghost btn-sm min-h-10 w-fit rounded-xl">
        Back to explore
      </Link>

      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-base-content">Start a trade</h1>
        <p className="text-sm text-base-content/70">
          With{" "}
          <span className="font-medium text-base-content">
            {peer.avatarEmoji ? `${peer.avatarEmoji} ` : ""}
            {peer.alias ?? "Member"}
          </span>{" "}
          on {exchange.name}. Choose what you offer and what you want; they will get an offer to accept, decline, or
          counter.
        </p>
      </header>

      {err ? (
        <div role="alert" className="alert alert-error text-sm">
          {err}
        </div>
      ) : null}

      {myRows.length === 0 || theirRows.length === 0 ? (
        <div className="card border border-base-content/10 bg-base-200/40 shadow-sm">
          <div className="card-body gap-2 p-5 text-sm text-base-content/80">
            {myRows.length === 0 ? (
              <p>List at least one item on this exchange before you can propose a swap.</p>
            ) : (
              <p>They do not have any active listings on this exchange right now.</p>
            )}
            <Link href={`/exchanges/${encodeURIComponent(exchangeId)}`} className="btn btn-outline btn-sm min-h-10 w-fit rounded-xl">
              Manage listings
            </Link>
          </div>
        </div>
      ) : (
        <form action={submitTradeInitiationAction} className="card border border-base-content/10 bg-base-100 shadow-sm">
          <div className="card-body gap-5 p-5">
            <input type="hidden" name="exchangeId" value={exchangeId} />
            <input type="hidden" name="peerUserId" value={peerUserId} />

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-base-content">You offer</h2>
              <ul className="space-y-2">
                {myRows.map((row) => (
                  <li key={row.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-base-content/10 bg-base-200/20 p-3">
                      <input
                        type="checkbox"
                        name="initiatorItemIds"
                        value={row.inventoryItemId}
                        className="checkbox checkbox-sm mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="font-medium text-base-content">{row.inventoryItem.name}</span>
                        <span className="mt-0.5 block text-xs text-base-content/60 line-clamp-2">{row.inventoryItem.description}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-base-content">You receive</h2>
              <ul className="space-y-2">
                {theirRows.map((row) => {
                  const defaultChecked = focusItemId === row.inventoryItemId;
                  return (
                    <li key={row.id}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-base-content/10 bg-base-200/20 p-3">
                        <input
                          type="checkbox"
                          name="peerItemIds"
                          value={row.inventoryItemId}
                          defaultChecked={defaultChecked}
                          className="checkbox checkbox-sm mt-0.5"
                        />
                        <span className="min-w-0">
                          <span className="font-medium text-base-content">{row.inventoryItem.name}</span>
                          <span className="mt-0.5 block text-xs text-base-content/60 line-clamp-2">{row.inventoryItem.description}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>

            <button type="submit" className="btn btn-primary min-h-11 w-full rounded-xl">
              Send offer
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
