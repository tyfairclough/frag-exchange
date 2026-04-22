import Link from "next/link";
import { ExchangeKind, ExchangeVisibility } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { hashExchangeInviteToken } from "@/lib/exchange-invite-token-hash";
import { joinPublicExchangeFormAction } from "@/app/(main)/exchanges/actions";
import { ExchangesWelcomeBannerDismiss } from "@/app/(main)/exchanges/components/exchanges-welcome-banner-dismiss";
import { MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";
import {
  exchangeLogoSrcSetForListThumbnail,
  exchangeLogoUrlForListThumbnail,
} from "@/lib/exchange-logo-urls";

function reefersLabel(count: number): string {
  return count === 1 ? "1 reefer" : `${count} reefers`;
}

function itemsAvailableLabel(count: number): string {
  return count === 1 ? "1 item available" : `${count} items available`;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

const exchangeErrors: Record<string, string> = {
  forbidden: "You do not have permission for that action.",
  "join-not-found": "That public exchange was not found.",
  "invite-invalid": "This invite link is invalid or has expired.",
  "listing-invalid": "That listing request was incomplete.",
  "listing-forbidden": "Join this exchange before listing items here.",
  "listing-coral": "That item cannot be listed right now.",
  "listing-kind": "That item type is not enabled for this exchange.",
  "trade-rate-limit": "Too many trade actions in a short time. Please wait a minute and try again.",
};

export default async function ExchangesPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    created?: string;
    deleted?: string;
    welcome?: string;
    inviteToken?: string | string[];
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const errorMessage = params.error ? exchangeErrors[params.error] ?? "Something went wrong." : null;

  const showWelcome = Boolean(params.welcome);
  let welcomeBanner: { kind: "manual" } | { kind: "invite"; exchangeName: string; token: string } | null = null;
  if (showWelcome) {
    const inviteParam = params.inviteToken;
    const inviteTokenRaw =
      typeof inviteParam === "string"
        ? inviteParam.trim()
        : Array.isArray(inviteParam)
          ? (inviteParam[0] ?? "").trim()
          : "";
    if (inviteTokenRaw) {
      const invite = await getPrisma().exchangeInvite.findUnique({
        where: { tokenHash: hashExchangeInviteToken(inviteTokenRaw) },
        select: {
          email: true,
          usedAt: true,
          expiresAt: true,
          exchange: { select: { name: true } },
        },
      });
      const nowWelcome = new Date();
      if (
        invite &&
        !invite.usedAt &&
        invite.expiresAt > nowWelcome &&
        normalizeEmail(user.email) === normalizeEmail(invite.email)
      ) {
        welcomeBanner = { kind: "invite", exchangeName: invite.exchange.name, token: inviteTokenRaw };
      } else {
        welcomeBanner = { kind: "manual" };
      }
    } else {
      welcomeBanner = { kind: "manual" };
    }
  }

  const [myMemberships, publicExchanges] = await Promise.all([
    getPrisma().exchangeMembership.findMany({
      where: { userId: user.id },
      include: {
        exchange: {
          include: {
            _count: { select: { memberships: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    }),
    getPrisma().exchange.findMany({
      where: { visibility: ExchangeVisibility.PUBLIC },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { memberships: true } },
      },
    }),
  ]);

  const now = new Date();
  const listingExchangeIds = [
    ...new Set([...myMemberships.map((m) => m.exchangeId), ...publicExchanges.map((e) => e.id)]),
  ];
  const listingAgg =
    listingExchangeIds.length === 0
      ? []
      : await getPrisma().exchangeListing.groupBy({
          by: ["exchangeId"],
          where: {
            exchangeId: { in: listingExchangeIds },
            expiresAt: { gt: now },
          },
          _count: { _all: true },
        });
  const activeListingsByExchange = new Map(listingAgg.map((g) => [g.exchangeId, g._count._all]));

  const myIds = new Set(myMemberships.map((m) => m.exchangeId));
  const joinablePublicExchanges = publicExchanges.filter((ex) => !myIds.has(ex.id));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
            Exchanges
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Join public exchanges or use an invite to join a private exchange.</p>
        </div>
      </div>

      {welcomeBanner ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-semibold text-emerald-950">Welcome to REEFxCHANGE</p>
            {welcomeBanner.kind === "manual" ? (
              <p className="text-emerald-900">
                You have successfully joined. Browse the <span className="font-medium">Public exchanges</span> section below to find a community to join.
              </p>
            ) : (
              <p className="text-emerald-900">
                You have successfully joined. You were invited to{" "}
                <span className="font-medium">{welcomeBanner.exchangeName}</span>.{" "}
                <Link
                  href={`/exchanges/invite/${encodeURIComponent(welcomeBanner.token)}`}
                  className="font-semibold underline-offset-2 hover:underline"
                  style={{ color: MARKETING_LINK_BLUE }}
                >
                  Complete your invite
                </Link>{" "}
                to open that exchange.
              </p>
            )}
          </div>
          <ExchangesWelcomeBannerDismiss />
        </div>
      ) : null}

      {params.created ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Exchange created. You are a member.
        </div>
      ) : null}

      {params.deleted ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Exchange deleted.
        </div>
      ) : null}

      {errorMessage ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">My exchanges</h2>
        {myMemberships.length === 0 ? (
          <p className="text-sm text-slate-600">You have not joined any exchanges yet.</p>
        ) : (
          <ul className="space-y-3">
            {myMemberships.map((m) => {
              const exchangeHref = `/exchanges/${m.exchange.id}`;
              const listLogoUrl = exchangeLogoUrlForListThumbnail(m.exchange);
              const listLogoSrcSet = exchangeLogoSrcSetForListThumbnail(m.exchange);
              return (
                <li key={m.id}>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                    <div className="flex flex-row flex-wrap items-center justify-between gap-3">
                      {listLogoUrl ? (
                        <img
                          src={listLogoUrl}
                          srcSet={listLogoSrcSet}
                          alt=""
                          aria-hidden
                          className="h-10 w-10 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <img src="/reefx_logo.svg" alt="" aria-hidden className="h-10 w-10 shrink-0 object-contain" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col items-start justify-start gap-0">
                          <Link
                            href={exchangeHref}
                            className="font-semibold outline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
                            style={{ color: MARKETING_NAVY }}
                          >
                            {m.exchange.name}
                          </Link>
                          <p className="text-xs text-slate-600">
                            {m.exchange.kind === ExchangeKind.EVENT ? "Event" : "Group"} ·{" "}
                            {m.exchange.visibility === ExchangeVisibility.PUBLIC ? "Public" : "Private"} · Role:{" "}
                            {m.role === "EVENT_MANAGER" ? "Event manager" : "Member"} · {reefersLabel(m.exchange._count.memberships)}{" "}
                            · {itemsAvailableLabel(activeListingsByExchange.get(m.exchange.id) ?? 0)}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={exchangeHref}
                        className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold transition hover:border-slate-400 hover:bg-slate-100"
                        style={{ color: MARKETING_LINK_BLUE }}
                      >
                        Go to exchange
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Public exchanges</h2>
        {joinablePublicExchanges.length === 0 ? (
          <p className="text-sm text-slate-600">
            {publicExchanges.length === 0
              ? "No public exchanges yet."
              : "No other public exchanges to join right now."}
          </p>
        ) : (
          <ul className="space-y-3">
            {joinablePublicExchanges.map((ex) => {
              const listLogoUrl = exchangeLogoUrlForListThumbnail(ex);
              const listLogoSrcSet = exchangeLogoSrcSetForListThumbnail(ex);
              return (
              <li key={ex.id}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                  <div className="flex flex-row flex-wrap items-center justify-between gap-3">
                    {listLogoUrl ? (
                      <img
                        src={listLogoUrl}
                        srcSet={listLogoSrcSet}
                        alt=""
                        aria-hidden
                        className="h-10 w-10 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <img src="/reefx_logo.svg" alt="" aria-hidden className="h-10 w-10 shrink-0 object-contain" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col items-start justify-start gap-0">
                        <Link
                          href={`/exchanges/${ex.id}`}
                          className="font-semibold hover:underline"
                          style={{ color: MARKETING_NAVY }}
                        >
                          {ex.name}
                        </Link>
                        <p className="text-xs text-slate-600">
                          {ex.kind === ExchangeKind.EVENT ? "Event" : "Group"} · Public · {reefersLabel(ex._count.memberships)} ·{" "}
                          {itemsAvailableLabel(activeListingsByExchange.get(ex.id) ?? 0)}
                        </p>
                      </div>
                    </div>
                    <form action={joinPublicExchangeFormAction}>
                      <input type="hidden" name="exchangeId" value={ex.id} />
                      <button
                        type="submit"
                        className="inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold transition hover:border-slate-400 hover:bg-slate-100"
                        style={{ color: MARKETING_LINK_BLUE }}
                      >
                        Join
                      </button>
                    </form>
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
