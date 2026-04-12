import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CoralProfileStatus,
  ExchangeKind,
  ExchangeMembershipRole,
  ExchangeVisibility,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { EventDateHighlight } from "@/app/(main)/exchanges/components/event-datetime-highlight";
import { canManageEventDesk, canViewExchangeDirectory, isSuperAdmin } from "@/lib/super-admin";
import { joinPublicExchangeFormAction } from "@/app/(main)/exchanges/actions";
import { MARKETING_CTA_GREEN, MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";
import { getRequestOrigin } from "@/lib/request-origin";
import { expireDueTradesAndNotify } from "@/lib/trade-expire-notify";
import { tradeBucketsFromGroupBy } from "@/lib/exchange-hub-stats";

function reefersLabel(count: number): string {
  return count === 1 ? "1 reefer" : `${count} reefers`;
}

const detailErrors: Record<string, string> = {
  forbidden: "You do not have permission for that action.",
  "promote-invalid": "That member cannot be promoted right now.",
  "demote-invalid": "That manager cannot be demoted right now.",
  "listing-forbidden": "Join this exchange before listing items here.",
  "listing-coral": "That item cannot be listed on this exchange.",
  "listing-kind": "That item type is not enabled on this exchange.",
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
    item?: string;
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

  if (membership && canView && (sp.listed === "1" || sp.unlisted === "1")) {
    const q = new URLSearchParams();
    if (sp.listed === "1") q.set("listed", "1");
    if (sp.unlisted === "1") q.set("unlisted", "1");
    const itemTrim = sp.item?.trim();
    if (itemTrim) q.set("item", itemTrim);
    redirect(`/exchanges/${encodeURIComponent(id)}/listings?${q.toString()}`);
  }

  let exchangeWideActiveListingCount = 0;
  let myActiveListingCount = 0;
  let tradeBuckets = { complete: 0, pending: 0, cancelled: 0 };

  if (membership && canView) {
    const baseUrl = await getRequestOrigin();
    await expireDueTradesAndNotify(getPrisma(), { baseUrl, now, exchangeId: exchange.id });

    const [wideCount, mineCount, tradeStatusRows] = await Promise.all([
      getPrisma().exchangeListing.count({
        where: {
          exchangeId: exchange.id,
          expiresAt: { gt: now },
          inventoryItem: {
            profileStatus: CoralProfileStatus.UNLISTED,
            remainingQuantity: { gt: 0 },
          },
        },
      }),
      getPrisma().exchangeListing.count({
        where: {
          exchangeId: exchange.id,
          expiresAt: { gt: now },
          inventoryItem: {
            userId: user.id,
            profileStatus: CoralProfileStatus.UNLISTED,
            remainingQuantity: { gt: 0 },
          },
        },
      }),
      getPrisma().trade.groupBy({
        by: ["status"],
        where: {
          exchangeId: exchange.id,
          OR: [{ initiatorUserId: user.id }, { peerUserId: user.id }],
        },
        _count: { _all: true },
      }),
    ]);

    exchangeWideActiveListingCount = wideCount;
    myActiveListingCount = mineCount;
    tradeBuckets = tradeBucketsFromGroupBy(tradeStatusRows);
  }

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

  const exploreHref = `/explore?exchangeId=${encodeURIComponent(exchange.id)}`;
  const tradesHref = `/exchanges/${encodeURIComponent(exchange.id)}/trades`;
  const listingsHref = `/exchanges/${encodeURIComponent(exchange.id)}/listings`;

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
          <div className="flex flex-wrap gap-2">
            {membership ? (
              <Link
                href={exploreHref}
                className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold text-white transition hover:opacity-95"
                style={{ backgroundColor: MARKETING_CTA_GREEN }}
              >
                Explore this exchange
              </Link>
            ) : null}
            {showManageExchange ? (
              <Link
                href={`/operator/${encodeURIComponent(exchange.id)}`}
                className="inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Manage exchange
              </Link>
            ) : null}
          </div>
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
            eventPickupHref={
              canView && membership ? `/exchanges/${encodeURIComponent(exchange.id)}/event-pickup` : undefined
            }
          />
        ) : null}
      </header>

      {!membership && exchange.visibility === ExchangeVisibility.PUBLIC ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
          <div className="flex flex-row flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-700">Join this public exchange to list items and browse other reefers.</p>
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
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="exchange-dashboard-heading">
          <h2 id="exchange-dashboard-heading" className="text-sm font-semibold" style={{ color: MARKETING_NAVY }}>
            At a glance
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3 sm:items-stretch">
            <div className="flex min-h-0 min-w-0 flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-col">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Items on the exchange</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{exchangeWideActiveListingCount}</p>
                <p className="mt-1 text-xs text-slate-600">All active listings (including yours)</p>
              </div>
              <Link
                href={exploreHref}
                className="inline-flex min-h-9 w-fit shrink-0 items-center rounded-full border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Explore listings
              </Link>
            </div>

            <div className="flex min-h-0 min-w-0 flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-col">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your trades</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  <li>
                    <span className="font-semibold tabular-nums text-slate-900">{tradeBuckets.complete}</span> complete
                  </li>
                  <li>
                    <span className="font-semibold tabular-nums text-slate-900">{tradeBuckets.pending}</span> pending
                  </li>
                  <li>
                    <span className="font-semibold tabular-nums text-slate-900">{tradeBuckets.cancelled}</span> cancelled
                  </li>
                </ul>
              </div>
              <Link
                href={tradesHref}
                className="inline-flex min-h-9 w-fit shrink-0 items-center rounded-full border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                View trades
              </Link>
            </div>

            <div className="flex min-h-0 min-w-0 flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-col">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your listings here</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{myActiveListingCount}</p>
                <p className="mt-1 text-xs text-slate-600">Items you have listed on this exchange.</p>
              </div>
              <Link
                href={listingsHref}
                className="inline-flex min-h-9 w-fit shrink-0 items-center rounded-full border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Manage listings
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
