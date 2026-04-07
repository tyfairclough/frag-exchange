import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CoralListingMode,
  CoralProfileStatus,
  ExchangeKind,
  ExchangeMembershipRole,
  ExchangeVisibility,
  InventoryKind,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { EventDateHighlight } from "@/app/(main)/exchanges/components/event-datetime-highlight";
import { canManageEventDesk, canViewExchangeDirectory, isSuperAdmin } from "@/lib/super-admin";
import { joinPublicExchangeFormAction } from "@/app/(main)/exchanges/actions";
import {
  addExchangeListingFormAction,
  removeExchangeListingFormAction,
} from "@/app/(main)/exchanges/listing-actions";
import { MARKETING_CTA_GREEN, MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";

function reefersLabel(count: number): string {
  return count === 1 ? "1 reefer" : `${count} reefers`;
}

function kindLabel(kind: InventoryKind) {
  switch (kind) {
    case InventoryKind.CORAL:
      return "Coral";
    case InventoryKind.FISH:
      return "Fish";
    default:
      return "Equipment";
  }
}

function listingModeLabel(mode: CoralListingMode) {
  switch (mode) {
    case CoralListingMode.POST:
      return "Post";
    case CoralListingMode.MEET:
      return "Meet";
    default:
      return "Post or meet";
  }
}

const detailErrors: Record<string, string> = {
  forbidden: "You do not have permission for that action.",
  "promote-invalid": "That member cannot be promoted right now.",
  "demote-invalid": "That manager cannot be demoted right now.",
  "listing-forbidden": "Join this exchange before listing corals here.",
  "listing-coral": "That coral cannot be listed on this exchange.",
  "listing-invalid": "That listing request was incomplete.",
};

export default async function ExchangeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    joined?: string;
    updated?: string;
    error?: string;
    listed?: string;
    unlisted?: string;
  }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;

  const exchange = await getPrisma().exchange.findUnique({
    where: { id },
    include: {
      memberships: {
        include: { user: { select: { id: true, email: true, alias: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!exchange) {
    notFound();
  }

  const membership = exchange.memberships.find((m) => m.userId === user.id) ?? null;
  const canView = canViewExchangeDirectory(exchange, membership, user);
  const superUser = isSuperAdmin(user);
  const showManageExchange =
    canView && (superUser || membership?.role === ExchangeMembershipRole.EVENT_MANAGER);
  const eventDesk = canManageEventDesk(exchange, membership, user);

  const errorMessage = sp.error ? detailErrors[sp.error] ?? "Something went wrong." : null;

  const now = new Date();
  const myListableItems =
    membership && canView
      ? await getPrisma().inventoryItem.findMany({
          where: { userId: user.id, profileStatus: CoralProfileStatus.UNLISTED },
          orderBy: { updatedAt: "desc" },
        })
      : [];
  const myListingsHere =
    membership && canView
      ? await getPrisma().exchangeListing.findMany({
          where: {
            exchangeId: exchange.id,
            inventoryItem: { userId: user.id },
          },
          include: { inventoryItem: true },
          orderBy: { listedAt: "desc" },
        })
      : [];
  const activeListingByItemId = new Map(
    myListingsHere.filter((l) => l.expiresAt > now).map((l) => [l.inventoryItemId, l]),
  );
  const myUnlistedItemsForExchange = myListableItems.filter((c) => !activeListingByItemId.has(c.id));

  if (!canView) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-bold" style={{ color: MARKETING_NAVY }}>
            Private exchange
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            This hub is invite-only. Ask an organiser for a link, then open it while signed in with the invited email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      {sp.joined === "1" || sp.joined === "invite" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {sp.joined === "invite" ? "You joined using an invite." : "You are now a reefer on this exchange."}
        </div>
      ) : null}

      {sp.updated === "1" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Exchange updated.
        </div>
      ) : null}

      {errorMessage ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      {sp.listed === "1" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Coral listed on this exchange (90-day window). Others can find it in Explore.
        </div>
      ) : null}

      {sp.unlisted === "1" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Coral removed from this exchange.
        </div>
      ) : null}

      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {exchange.logo80Url ? (
              <img src={exchange.logo80Url} alt="" aria-hidden className="h-10 w-10 rounded-md object-cover" />
            ) : (
              <img src="/reefx_logo.svg" alt="" aria-hidden className="h-10 w-10 object-contain" />
            )}
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
              {exchange.name}
            </h1>
          </div>
          {showManageExchange ? (
            <Link
              href={`/operator/${encodeURIComponent(exchange.id)}`}
              className="inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
            >
              Manage exchange
            </Link>
          ) : null}
        </div>
        {exchange.description ? (
          <p className="text-sm leading-relaxed text-slate-600">{exchange.description}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {membership ? (
            <Link
              href={`/exchanges/${encodeURIComponent(exchange.id)}/reefers`}
              className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white transition hover:opacity-95"
              style={{ backgroundColor: MARKETING_LINK_BLUE }}
            >
              {reefersLabel(exchange.memberships.length)}
            </Link>
          ) : (
            <span className="tooltip tooltip-bottom" data-tip="Join this exchange to see Reefers">
              <span
                className="inline-flex cursor-not-allowed items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white opacity-60"
                style={{ backgroundColor: MARKETING_LINK_BLUE }}
                aria-disabled="true"
              >
                {reefersLabel(exchange.memberships.length)}
              </span>
            </span>
          )}
          {membership?.role === ExchangeMembershipRole.EVENT_MANAGER ? (
            <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
              Event manager
            </span>
          ) : null}
        </div>
        {exchange.kind === ExchangeKind.EVENT && exchange.eventDate ? (
          <EventDateHighlight
            eventAtIso={exchange.eventDate.toISOString()}
            formattedDate={exchange.eventDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            eventDeskHref={`/exchanges/${encodeURIComponent(exchange.id)}/event-ops`}
            showEventDeskLink={eventDesk}
          />
        ) : null}
        {exchange.kind === ExchangeKind.EVENT && canView && membership ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/exchanges/${encodeURIComponent(exchange.id)}/event-pickup`}
              className="inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
            >
              Event pickup
            </Link>
          </div>
        ) : null}
      </header>

      {!membership && exchange.visibility === ExchangeVisibility.PUBLIC ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
          <div className="flex flex-row flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-700">Join this public exchange to list corals and browse other reefers.</p>
            <form action={joinPublicExchangeFormAction}>
              <input type="hidden" name="exchangeId" value={exchange.id} />
              <button
                type="submit"
                className="inline-flex min-h-10 items-center rounded-full px-5 text-sm font-semibold text-white transition hover:opacity-95"
                style={{ backgroundColor: MARKETING_CTA_GREEN }}
              >
                Join
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {!membership && exchange.visibility === ExchangeVisibility.PRIVATE ? (
        <p className="text-sm text-slate-600">
          You can only join this private exchange with an invite link from an organiser.
        </p>
      ) : null}

      {membership ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-4">
            <div className="flex flex-nowrap items-start justify-start gap-3 text-left">
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/explore?exchangeId=${encodeURIComponent(exchange.id)}`}
                  className="inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                >
                  Explore this exchange
                </Link>
                <Link
                  href={`/exchanges/${encodeURIComponent(exchange.id)}/trades`}
                  className="inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                >
                  Trades
                </Link>
              </div>
            </div>

            <h2 className="text-sm font-semibold" style={{ color: MARKETING_NAVY }}>
              Your listings here
            </h2>
            <p className="text-xs text-slate-500">
              Profile corals can sit on multiple exchanges until a trade completes. Each listing expires after 90 days (renew by listing
              again).
            </p>

            {activeListingByItemId.size === 0 ? (
              <p className="text-sm text-slate-600">No active listings on this exchange yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {[...activeListingByItemId.values()].map((l) => (
                  <li key={l.id}>
                    <article className="card border border-base-content/10 bg-base-100 shadow-sm">
                      <div className="card-body gap-3 p-4">
                        <div className="flex gap-3">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-base-200 text-2xl text-base-content/40">
                            {l.inventoryItem.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element -- arbitrary hobbyist image URLs
                              <img src={l.inventoryItem.imageUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span aria-hidden>🪸</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="badge badge-ghost badge-sm">{kindLabel(l.inventoryItem.kind)}</span>
                              <h3 className="font-semibold text-base-content">{l.inventoryItem.name}</h3>
                              {l.inventoryItem.freeToGoodHome ? (
                                <span className="badge badge-success badge-sm badge-outline">Free to good home</span>
                              ) : null}
                            </div>
                            <p className="mt-1 line-clamp-2 text-sm text-base-content/70">
                              {l.inventoryItem.description || "No description yet."}
                            </p>
                            <p className="mt-2 text-xs text-base-content/60">
                              {listingModeLabel(l.inventoryItem.listingMode)}
                              {l.inventoryItem.kind === InventoryKind.CORAL && l.inventoryItem.coralType
                                ? ` · ${l.inventoryItem.coralType}`
                                : ""}
                              {l.inventoryItem.colour ? ` · ${l.inventoryItem.colour}` : ""}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                              Listed until{" "}
                              <time dateTime={l.expiresAt.toISOString()}>
                                {l.expiresAt.toLocaleDateString(undefined, { dateStyle: "medium" })}
                              </time>
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 border-t border-base-content/10 pt-3">
                          <form action={removeExchangeListingFormAction}>
                            <input type="hidden" name="exchangeId" value={exchange.id} />
                            <input type="hidden" name="inventoryItemId" value={l.inventoryItemId} />
                            <button
                              type="submit"
                              className="inline-flex min-h-9 items-center rounded-full border border-rose-300 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                            >
                              Remove
                            </button>
                          </form>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your unlisted items</h3>
              {myListableItems.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">
                  Add items under{" "}
                  <Link href="/my-items" className="font-semibold hover:underline" style={{ color: MARKETING_LINK_BLUE }}>
                    My items
                  </Link>{" "}
                  first.
                </p>
              ) : myUnlistedItemsForExchange.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">All of your available items are already listed on this exchange.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-3">
                  {myUnlistedItemsForExchange.map((c) => (
                    <li key={c.id}>
                      <article className="card border border-base-content/10 bg-base-100 shadow-sm">
                        <div className="card-body gap-3 p-4">
                          <div className="flex gap-3">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-base-200 text-2xl text-base-content/40">
                              {c.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element -- arbitrary hobbyist image URLs
                                <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span aria-hidden>🪸</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="badge badge-ghost badge-sm">{kindLabel(c.kind)}</span>
                                <h3 className="font-semibold text-base-content">{c.name}</h3>
                                {c.freeToGoodHome ? (
                                  <span className="badge badge-success badge-sm badge-outline">Free to good home</span>
                                ) : null}
                              </div>
                              <p className="mt-1 line-clamp-2 text-sm text-base-content/70">
                                {c.description || "No description yet."}
                              </p>
                              <p className="mt-2 text-xs text-base-content/60">
                                {listingModeLabel(c.listingMode)}
                                {c.kind === InventoryKind.CORAL && c.coralType ? ` · ${c.coralType}` : ""}
                                {c.colour ? ` · ${c.colour}` : ""}
                              </p>
                              <p className="mt-2 text-xs text-slate-500">
                                Not listed here, or listing expired - you can list again.
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 border-t border-base-content/10 pt-3">
                            <form action={addExchangeListingFormAction}>
                              <input type="hidden" name="exchangeId" value={exchange.id} />
                              <input type="hidden" name="inventoryItemId" value={c.id} />
                              <button
                                type="submit"
                                className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold text-white transition hover:opacity-95"
                                style={{ backgroundColor: MARKETING_CTA_GREEN }}
                              >
                                List here
                              </button>
                            </form>
                          </div>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
