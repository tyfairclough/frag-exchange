import Link from "next/link";
import { ExchangeMembershipRole } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";
import { BackLink } from "@/components/back-link";

export default async function OperatorExchangeListPage() {
  const user = await requireUser();

  const rows = await getPrisma().exchangeMembership.findMany({
    where: { userId: user.id, role: ExchangeMembershipRole.EVENT_MANAGER },
    include: { exchange: { select: { id: true, name: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Operator</p>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
          Your exchanges
        </h1>
        <p className="text-sm text-slate-600">
          Choose an exchange to open its management dashboard (invites, roster, trades, and more).
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          You are not an event manager on any exchange yet. When an organiser promotes you, the hub will appear here.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/operator/${encodeURIComponent(row.exchange.id)}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
              >
                <p className="font-semibold" style={{ color: MARKETING_NAVY }}>
                  {row.exchange.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">Manage exchange →</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <BackLink
        href="/exchanges"
        variant="text"
        className="min-h-10 rounded-full px-4 text-white no-underline transition hover:opacity-95"
        style={{ backgroundColor: MARKETING_LINK_BLUE }}
      >
        Back to exchanges
      </BackLink>
    </div>
  );
}
