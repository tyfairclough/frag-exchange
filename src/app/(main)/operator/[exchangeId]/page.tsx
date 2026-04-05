import { notFound } from "next/navigation";
import {
  CoralProfileStatus,
  ExchangeKind,
  ExchangeMembershipRole,
  ExchangeVisibility,
  TradeStatus,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  canAccessOperatorDashboard,
  canIssuePrivateInvite,
  canManageEventDesk,
  canPromoteEventManager,
  canSeeMemberRoster,
  canViewExchangeDirectory,
  isSuperAdmin,
} from "@/lib/super-admin";
import {
  demoteEventManagerFormAction,
  promoteEventManagerFormAction,
} from "@/app/(main)/exchanges/actions";
import { EventDateHighlight } from "@/app/(main)/exchanges/components/event-datetime-highlight";
import { OperatorExchangeDeleteDialog } from "@/app/(main)/operator/components/operator-exchange-delete-dialog";
import { OperatorExchangeTabs } from "@/app/(main)/operator/components/operator-exchange-tabs";
import { MARKETING_NAVY } from "@/components/marketing/marketing-chrome";

function tradeStatusLabel(status: TradeStatus): string {
  switch (status) {
    case TradeStatus.OFFER:
      return "Offer / awaiting response";
    case TradeStatus.COUNTERED:
      return "Countered";
    case TradeStatus.APPROVED:
      return "Approved / completed";
    case TradeStatus.REJECTED:
      return "Rejected";
    case TradeStatus.EXPIRED:
      return "Expired";
    default:
      return status;
  }
}

const operatorErrors: Record<string, string> = {
  forbidden: "You do not have permission for that action.",
  "promote-invalid": "That member cannot be promoted right now.",
  "demote-invalid": "That manager cannot be demoted right now.",
};

export default async function OperatorExchangeDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ exchangeId: string }>;
  searchParams: Promise<{ updated?: string; promoted?: string; demoted?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { exchangeId } = await params;
  const sp = await searchParams;

  const exchange = await getPrisma().exchange.findUnique({
    where: { id: exchangeId },
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
  if (!canViewExchangeDirectory(exchange, membership, user) || !canAccessOperatorDashboard(user, membership)) {
    notFound();
  }

  const roster = canSeeMemberRoster(exchange, membership, user);
  const invitePower = canIssuePrivateInvite(exchange, membership, user);
  const promotePower = canPromoteEventManager(exchange, user);
  const eventDesk = canManageEventDesk(exchange, membership, user);
  const superUser = isSuperAdmin(user);
  const errorMessage = sp.error ? operatorErrors[sp.error] ?? "Something went wrong." : null;

  const now = new Date();
  const [activeListingsCount, everListedCount, tradeGroups] = await Promise.all([
    getPrisma().exchangeListing.count({
      where: {
        exchangeId: exchange.id,
        expiresAt: { gt: now },
        coral: { profileStatus: CoralProfileStatus.UNLISTED },
      },
    }),
    // Row count: each list action creates a row; renewals add rows — "total ever listed" per plan.
    getPrisma().exchangeListing.count({ where: { exchangeId: exchange.id } }),
    getPrisma().trade.groupBy({
      by: ["status"],
      where: { exchangeId: exchange.id },
      _count: true,
    }),
  ]);

  const tradeCountByStatus = new Map<TradeStatus, number>();
  for (const row of tradeGroups) {
    tradeCountByStatus.set(row.status, row._count);
  }

  const tradeStatusesOrdered: TradeStatus[] = [
    TradeStatus.OFFER,
    TradeStatus.COUNTERED,
    TradeStatus.APPROVED,
    TradeStatus.REJECTED,
    TradeStatus.EXPIRED,
  ];

  const pendingInvites = roster
    ? await getPrisma().exchangeInvite.findMany({
        where: {
          exchangeId: exchange.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, expiresAt: true },
      })
    : [];

  const reefersCount = exchange.memberships.length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      {sp.updated === "1" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Exchange updated.
        </div>
      ) : null}

      {sp.promoted === "1" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Reefer promoted to event manager.
        </div>
      ) : null}

      {sp.demoted === "1" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Event manager demoted to reefer.
        </div>
      ) : null}

      {errorMessage ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      <OperatorExchangeTabs
        exchangeId={exchange.id}
        active="dashboard"
        exchangeKind={exchange.kind}
        showEventPickup={exchange.kind === ExchangeKind.EVENT && membership != null}
        showEventDesk={eventDesk}
        showPrivateInvites={invitePower}
      />

      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {exchange.logo80Url ? (
              <img src={exchange.logo80Url} alt="" aria-hidden className="h-10 w-10 rounded-md object-cover" />
            ) : (
              <img src="/reefx_logo.svg" alt="" aria-hidden className="h-10 w-10 object-contain" />
            )}
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Manage exchange</p>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
                {exchange.name}
              </h1>
            </div>
          </div>
          <OperatorExchangeDeleteDialog exchangeId={exchange.id} exchangeName={exchange.name} />
        </div>
        {exchange.description ? (
          <p className="text-sm leading-relaxed text-slate-600">{exchange.description}</p>
        ) : null}
        {exchange.kind === ExchangeKind.EVENT && exchange.eventDate ? (
          <EventDateHighlight
            eventAtIso={exchange.eventDate.toISOString()}
            formattedDate={exchange.eventDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            eventDeskHref={`/exchanges/${encodeURIComponent(exchange.id)}/event-ops`}
            showEventDeskLink={eventDesk}
          />
        ) : null}
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Overview</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <p className="text-xs font-medium text-slate-500">Reefers</p>
            <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: MARKETING_NAVY }}>
              {reefersCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <p className="text-xs font-medium text-slate-500">Corals listed</p>
            <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: MARKETING_NAVY }}>
              <span>{activeListingsCount}</span>
              <span className="text-base font-semibold text-slate-400"> / </span>
              <span className="text-lg font-semibold text-slate-600">{everListedCount}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Active (90-day window) / rows ever listed</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
          <p className="text-xs font-medium text-slate-500">Trades by status</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {tradeStatusesOrdered.map((status) => (
              <li key={status} className="flex justify-between gap-2">
                <span>{tradeStatusLabel(status)}</span>
                <span className="tabular-nums font-semibold">{tradeCountByStatus.get(status) ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {roster ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Reefers</h2>
          <p className="text-xs text-slate-500">Super admins and event managers on event exchanges.</p>
          <ul className="space-y-2">
            {pendingInvites.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium" style={{ color: MARKETING_NAVY }}>
                    {inv.email}
                  </p>
                  <p className="text-xs text-slate-600">Pending activation</p>
                  <p className="text-xs text-slate-500">
                    Invite expires{" "}
                    <time dateTime={inv.expiresAt.toISOString()}>
                      {inv.expiresAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </time>
                  </p>
                </div>
              </li>
            ))}
            {exchange.memberships.map((m) => (
              <li
                key={m.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium" style={{ color: MARKETING_NAVY }}>
                    {m.user.alias ?? "No alias"}
                  </p>
                  <p className="text-xs text-slate-600">{m.user.email}</p>
                  <p className="text-xs text-slate-500">
                    {m.role === ExchangeMembershipRole.EVENT_MANAGER ? "Event manager" : "Reefer"}
                  </p>
                </div>
                {promotePower && m.role === ExchangeMembershipRole.MEMBER ? (
                  <form action={promoteEventManagerFormAction}>
                    <input type="hidden" name="exchangeId" value={exchange.id} />
                    <input type="hidden" name="memberUserId" value={m.user.id} />
                    <button
                      type="submit"
                      className="inline-flex min-h-8 items-center rounded-full border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                    >
                      Make event manager
                    </button>
                  </form>
                ) : null}
                {superUser &&
                exchange.kind === ExchangeKind.EVENT &&
                m.role === ExchangeMembershipRole.EVENT_MANAGER ? (
                  <form action={demoteEventManagerFormAction}>
                    <input type="hidden" name="exchangeId" value={exchange.id} />
                    <input type="hidden" name="managerUserId" value={m.user.id} />
                    <button
                      type="submit"
                      className="inline-flex min-h-8 items-center rounded-full border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                    >
                      Demote to reefer
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {exchange.visibility === ExchangeVisibility.PUBLIC ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600 shadow-sm">
          Invites apply to private exchanges only. This hub is public, so people can join from the exchange page or Explore.
        </section>
      ) : null}
    </div>
  );
}
