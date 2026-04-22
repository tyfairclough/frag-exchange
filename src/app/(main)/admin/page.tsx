import Link from "next/link";
import {
  ExchangeMembershipRole,
  TradeStatus,
  UserGlobalRole,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { MARKETING_CTA_GREEN, MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";

export default async function AdminDashboardPage() {
  const db = getPrisma();
  const [exchangeCount, hobbyistCount, approvedTrades, creatorRows, managerRows] = await db.$transaction([
    db.exchange.count(),
    db.user.count({ where: { globalRole: UserGlobalRole.MEMBER } }),
    db.trade.count({ where: { status: TradeStatus.APPROVED } }),
    db.exchange.findMany({
      distinct: ["createdById"],
      select: { createdById: true },
    }),
    db.exchangeMembership.findMany({
      where: { role: ExchangeMembershipRole.EVENT_MANAGER },
      distinct: ["userId"],
      select: { userId: true },
    }),
  ]);

  const operatorIds = new Set<string>();
  for (const row of creatorRows) {
    operatorIds.add(row.createdById);
  }
  for (const row of managerRows) {
    operatorIds.add(row.userId);
  }
  const operatorCount = operatorIds.size;

  const stats = [
    { label: "Exchanges", value: exchangeCount },
    { label: "Hobbyists", value: hobbyistCount, hint: "Users with member role (excludes super admin accounts)" },
    { label: "Operators", value: operatorCount, hint: "Exchange creators and event managers (may overlap with hobbyists)" },
    { label: "Trades (approved)", value: approvedTrades },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
            Admin
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">Platform overview and management.</p>
        </div>
        <Link
          href="/exchanges/new"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-5 text-sm font-semibold text-white transition hover:opacity-95 active:scale-[0.99]"
          style={{ backgroundColor: MARKETING_CTA_GREEN }}
        >
          New exchange
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Overview</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {stats.map(({ label, value, hint }) => (
            <li
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              title={hint}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
              {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Management</h2>
        <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <li>
            <Link
              href="/admin/users"
              className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold transition hover:border-slate-400 hover:bg-slate-50"
              style={{ color: MARKETING_LINK_BLUE }}
            >
              All users
            </Link>
          </li>
          <li>
            <Link
              href="/admin/exchanges"
              className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold transition hover:border-slate-400 hover:bg-slate-50"
              style={{ color: MARKETING_LINK_BLUE }}
            >
              All exchanges
            </Link>
          </li>
          <li>
            <Link
              href="/admin/business-claims"
              className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold transition hover:border-slate-400 hover:bg-slate-50"
              style={{ color: MARKETING_LINK_BLUE }}
            >
              Business claims
            </Link>
          </li>
          <li>
            <Link
              href="/me/admin/alias-words"
              className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold transition hover:border-slate-400 hover:bg-slate-50"
              style={{ color: MARKETING_LINK_BLUE }}
            >
              Alias words
            </Link>
          </li>
          <li>
            <Link
              href="/admin/ai-prompts"
              className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold transition hover:border-slate-400 hover:bg-slate-50"
              style={{ color: MARKETING_LINK_BLUE }}
            >
              AI prompts
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
