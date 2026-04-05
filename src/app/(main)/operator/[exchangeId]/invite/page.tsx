import { notFound } from "next/navigation";
import { ExchangeKind } from "@/generated/prisma/enums";
import { PrivateInviteForm } from "@/app/(main)/exchanges/components/private-invite-form";
import { OperatorExchangeTabs } from "@/app/(main)/operator/components/operator-exchange-tabs";
import { MARKETING_NAVY } from "@/components/marketing/marketing-chrome";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  canAccessOperatorDashboard,
  canIssuePrivateInvite,
  canManageEventDesk,
  canViewExchangeDirectory,
} from "@/lib/super-admin";

export default async function OperatorExchangeInvitePage({
  params,
}: {
  params: Promise<{ exchangeId: string }>;
}) {
  const user = await requireUser();
  const { exchangeId } = await params;

  const exchange = await getPrisma().exchange.findUnique({
    where: { id: exchangeId },
    include: {
      memberships: {
        where: { userId: user.id },
        take: 1,
      },
    },
  });

  if (!exchange) {
    notFound();
  }

  const membership = exchange.memberships[0] ?? null;
  if (!canViewExchangeDirectory(exchange, membership, user) || !canAccessOperatorDashboard(user, membership)) {
    notFound();
  }

  if (!canIssuePrivateInvite(exchange, membership, user)) {
    notFound();
  }

  const eventDesk = canManageEventDesk(exchange, membership, user);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <OperatorExchangeTabs
        exchangeId={exchange.id}
        active="invite"
        exchangeKind={exchange.kind}
        showEventPickup={exchange.kind === ExchangeKind.EVENT && membership != null}
        showEventDesk={eventDesk}
        showPrivateInvites
      />

      <header className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Manage exchange</p>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
          Invites (private)
        </h1>
        <p className="text-sm text-slate-600">{exchange.name}</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Super admins and event managers can send single-use links (comma-separated emails). Invitees must sign in
            with the same email address.
          </p>
          <PrivateInviteForm exchangeId={exchange.id} />
        </div>
      </section>
    </div>
  );
}
