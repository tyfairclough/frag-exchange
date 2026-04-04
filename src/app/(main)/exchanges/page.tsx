import Link from "next/link";
import { ExchangeKind, ExchangeVisibility } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { joinPublicExchangeFormAction } from "@/app/(main)/exchanges/actions";
import { MARKETING_CTA_GREEN, MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";

function reefersLabel(count: number): string {
  return count === 1 ? "1 reefer" : `${count} reefers`;
}

function coralsAvailableLabel(count: number): string {
  return count === 1 ? "1 coral available" : `${count} corals available`;
}

const exchangeErrors: Record<string, string> = {
  forbidden: "You do not have permission for that action.",
  "join-not-found": "That public exchange was not found.",
  "invite-invalid": "This invite link is invalid or has expired.",
  "listing-invalid": "That listing request was incomplete.",
  "listing-forbidden": "Join this exchange before listing corals here.",
  "listing-coral": "That coral cannot be listed right now.",
  "trade-rate-limit": "Too many trade actions in a short time. Please wait a minute and try again.",
};

export default async function ExchangesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; deleted?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const errorMessage = params.error ? exchangeErrors[params.error] ?? "Something went wrong." : null;
  const superUser = isSuperAdmin(user);

  const [myMemberships, publicExchanges, allExchanges] = await Promise.all([
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
    superUser
      ? getPrisma().exchange.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            _count: { select: { memberships: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const now = new Date();
  const listingExchangeIds = [
    ...new Set([
      ...myMemberships.map((m) => m.exchangeId),
      ...publicExchanges.map((e) => e.id),
      ...allExchanges.map((e) => e.id),
    ]),
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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
            Exchanges
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Join public hubs or use an invite for private ones.</p>
        </div>
        {superUser ? (
          <Link
            href="/exchanges/new"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-5 text-sm font-semibold text-white transition hover:opacity-95 active:scale-[0.99]"
            style={{ backgroundColor: MARKETING_CTA_GREEN }}
          >
            New exchange
          </Link>
        ) : null}
      </div>

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
              return (
                <li key={m.id}>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow">
                    <div className="flex flex-row flex-wrap items-center justify-between gap-3">
                      <Link href={exchangeHref} className="min-w-0 flex-1 rounded-xl outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500">
                        <div className="flex items-center gap-2">
                          {m.exchange.logo40Url ? (
                            <img src={m.exchange.logo40Url} alt="" aria-hidden className="h-8 w-8 rounded-md object-cover" />
                          ) : (
                            <img src="/reefx_logo.svg" alt="" aria-hidden className="h-8 w-8 object-contain" />
                          )}
                          <p className="font-semibold" style={{ color: MARKETING_NAVY }}>
                            {m.exchange.name}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          {m.exchange.kind === ExchangeKind.EVENT ? "Event" : "Group"} ·{" "}
                          {m.exchange.visibility === ExchangeVisibility.PUBLIC ? "Public" : "Private"} · Role:{" "}
                          {m.role === "EVENT_MANAGER" ? "Event manager" : "Member"} · {reefersLabel(m.exchange._count.memberships)}{" "}
                          · {coralsAvailableLabel(activeListingsByExchange.get(m.exchange.id) ?? 0)}
                        </p>
                      </Link>
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
        {publicExchanges.length === 0 ? (
          <p className="text-sm text-slate-600">No public exchanges yet.</p>
        ) : (
          <ul className="space-y-3">
            {publicExchanges.map((ex) => (
              <li key={ex.id}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                  <div className="flex flex-row flex-wrap items-center justify-between gap-3">
                    {ex.logo40Url ? (
                      <img src={ex.logo40Url} alt="" aria-hidden className="h-8 w-8 rounded-md object-cover" />
                    ) : (
                      <img src="/reefx_logo.svg" alt="" aria-hidden className="h-8 w-8 object-contain" />
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
                          {coralsAvailableLabel(activeListingsByExchange.get(ex.id) ?? 0)}
                        </p>
                      </div>
                    </div>
                    {myIds.has(ex.id) ? (
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">Joined</span>
                    ) : (
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
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {superUser && allExchanges.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">All exchanges (operators)</h2>
          <p className="text-xs text-slate-500">Includes private exchanges for support and setup.</p>
          <ul className="space-y-3">
            {allExchanges.map((ex) => (
              <li key={ex.id}>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
                  <div className="flex flex-row flex-wrap items-start justify-between gap-3 gap-y-2">
                    <Link href={`/exchanges/${ex.id}`} className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {ex.logo40Url ? (
                          <img src={ex.logo40Url} alt="" aria-hidden className="h-8 w-8 rounded-md object-cover" />
                        ) : (
                          <img src="/reefx_logo.svg" alt="" aria-hidden className="h-8 w-8 object-contain" />
                        )}
                        <p className="font-semibold hover:underline" style={{ color: MARKETING_NAVY }}>
                          {ex.name}
                        </p>
                      </div>
                      <p className="text-xs text-slate-600">
                        {ex.kind === ExchangeKind.EVENT ? "Event" : "Group"} ·{" "}
                        {ex.visibility === ExchangeVisibility.PUBLIC ? "Public" : "Private"} · {reefersLabel(ex._count.memberships)} ·{" "}
                        {coralsAvailableLabel(activeListingsByExchange.get(ex.id) ?? 0)}
                      </p>
                    </Link>
                    <Link
                      href={`/exchanges/${ex.id}/edit`}
                      className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
