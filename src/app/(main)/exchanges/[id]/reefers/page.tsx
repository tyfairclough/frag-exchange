import Link from "next/link";
import { notFound } from "next/navigation";
import { CoralProfileStatus, ExchangeKind, ExchangeVisibility } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  canAccessOperatorDashboard,
  canIssuePrivateInvite,
  canManageEventDesk,
  canViewExchangeDirectory,
} from "@/lib/super-admin";
import { OperatorExchangeTabs } from "@/app/(main)/operator/components/operator-exchange-tabs";
import { PendingInviteResendForm } from "@/app/(main)/exchanges/components/pending-invite-resend-form";
import { MARKETING_NAVY } from "@/components/marketing/marketing-chrome";

export default async function ExchangeReefersPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: exchangeId } = await params;

  const exchange = await getPrisma().exchange.findUnique({
    where: { id: exchangeId },
    include: {
      memberships: {
        include: { user: { select: { id: true, alias: true, avatarEmoji: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!exchange) {
    notFound();
  }

  const membership = exchange.memberships.find((m) => m.userId === user.id) ?? null;
  if (!canViewExchangeDirectory(exchange, membership, user)) {
    notFound();
  }

  const operatorTabs =
    canAccessOperatorDashboard(user, membership) ? (
      <OperatorExchangeTabs
        exchangeId={exchangeId}
        active="reefers"
        exchangeKind={exchange.kind}
        showEventPickup={exchange.kind === ExchangeKind.EVENT && membership != null}
        showEventDesk={canManageEventDesk(exchange, membership, user)}
        showPrivateInvites={canIssuePrivateInvite(exchange, membership, user)}
      />
    ) : null;

  const now = new Date();
  const listingRows = await getPrisma().exchangeListing.findMany({
    where: {
      exchangeId,
      expiresAt: { gt: now },
      coral: { profileStatus: CoralProfileStatus.UNLISTED },
    },
    select: { coral: { select: { userId: true } } },
  });

  const countByUserId = new Map<string, number>();
  for (const row of listingRows) {
    const uid = row.coral.userId;
    countByUserId.set(uid, (countByUserId.get(uid) ?? 0) + 1);
  }

  const showPendingInvites =
    exchange.visibility === ExchangeVisibility.PRIVATE && canIssuePrivateInvite(exchange, membership, user);
  const pendingInvites = showPendingInvites
    ? await getPrisma().exchangeInvite.findMany({
        where: {
          exchangeId,
          usedAt: null,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, createdAt: true, lastSentAt: true },
      })
    : [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      {operatorTabs}

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
          Reefers
        </h1>
        <p className="text-sm">
          <span className="font-medium" style={{ color: MARKETING_NAVY }}>
            {exchange.name}
          </span>
        </p>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="px-4 py-3 font-semibold text-slate-700">Reefer</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Corals on exchange</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Explore</th>
            </tr>
          </thead>
          <tbody>
            {exchange.memberships.map((m) => {
              const count = countByUserId.get(m.userId) ?? 0;
              const exploreHref = `/explore?exchangeId=${encodeURIComponent(exchangeId)}&owner=${encodeURIComponent(m.userId)}`;
              return (
                <tr key={m.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">
                      {m.user.avatarEmoji ? `${m.user.avatarEmoji} ` : ""}
                      {m.user.alias ?? "No alias"}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{count}</td>
                  <td className="px-4 py-3">
                    {count > 0 ? (
                      <Link
                        href={exploreHref}
                        className="inline-flex min-h-9 items-center rounded-full border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                      >
                        View in Explore
                      </Link>
                    ) : (
                      <span className="tooltip tooltip-bottom inline-block" data-tip="not currently exchanging coral">
                        <span
                          className="inline-flex min-h-9 cursor-not-allowed items-center rounded-full border border-dashed border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-400"
                          aria-disabled="true"
                        >
                          View in Explore
                        </span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {exchange.memberships.length === 0 ? (
        <p className="text-sm text-slate-600">No reefers on this exchange yet.</p>
      ) : null}

      {showPendingInvites ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Pending invitations</h2>
          <p className="text-sm text-slate-600">
            People who have been emailed an invite but have not joined yet. Resending rotates the link and extends the
            expiry window.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Invitation sent</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvites.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-600">
                      No pending invitations.
                    </td>
                  </tr>
                ) : (
                  pendingInvites.map((inv) => {
                    const sentAt = inv.lastSentAt ?? inv.createdAt;
                    return (
                      <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 font-medium text-slate-900">{inv.email}</td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">
                          {sentAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                        </td>
                        <td className="px-4 py-3">
                          <PendingInviteResendForm inviteId={inv.id} exchangeId={exchangeId} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
