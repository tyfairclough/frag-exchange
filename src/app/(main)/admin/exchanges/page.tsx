import Link from "next/link";
import { ExchangeKind, ExchangeVisibility } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";
import {
  exchangeLogoSrcSetForListThumbnail,
  exchangeLogoUrlForListThumbnail,
} from "@/lib/exchange-logo-urls";

function reefersLabel(count: number): string {
  return count === 1 ? "1 reefer" : `${count} reefers`;
}

export default async function AdminExchangesPage() {
  const exchanges = await getPrisma().exchange.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { memberships: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
            All exchanges
          </h1>
          <p className="mt-1 text-sm text-slate-600">Includes private exchanges for support and setup.</p>
        </div>
        <Link
          href="/admin"
          className="text-sm font-semibold hover:underline"
          style={{ color: MARKETING_LINK_BLUE }}
        >
          Back to dashboard
        </Link>
      </div>

      {exchanges.length === 0 ? (
        <p className="text-sm text-slate-600">No exchanges yet.</p>
      ) : (
        <ul className="space-y-3">
          {exchanges.map((ex) => {
            const listLogoUrl = exchangeLogoUrlForListThumbnail(ex);
            const listLogoSrcSet = exchangeLogoSrcSetForListThumbnail(ex);
            return (
            <li key={ex.id}>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
                <div className="flex flex-row flex-wrap items-start justify-between gap-3 gap-y-2">
                  <Link href={`/exchanges/${ex.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
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
                      <p className="font-semibold hover:underline" style={{ color: MARKETING_NAVY }}>
                        {ex.name}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600">
                      {ex.kind === ExchangeKind.EVENT ? "Event" : "Group"} ·{" "}
                      {ex.visibility === ExchangeVisibility.PUBLIC ? "Public" : "Private"} ·{" "}
                      {reefersLabel(ex._count.memberships)}
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
            );
          })}
        </ul>
      )}
    </div>
  );
}
