import Link from "next/link";
import { ExchangeKind, ExchangeVisibility } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { joinPublicExchangeFormAction } from "@/app/(main)/exchanges/actions";
import { MARKETING_CTA_GREEN, MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";

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
      include: { exchange: true },
      orderBy: { joinedAt: "desc" },
    }),
    getPrisma().exchange.findMany({
      where: { visibility: ExchangeVisibility.PUBLIC },
      orderBy: { createdAt: "desc" },
    }),
    superUser
      ? getPrisma().exchange.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            memberships: { select: { id: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const myIds = new Set(myMemberships.map((m) => m.exchangeId));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Chunk 4 — Exchanges</p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
            Exchanges
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Join public hubs or use an invite for private ones. Operators create exchanges and assign event managers on
            event exchanges.
          </p>
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

      {!superUser ? (
        <p className="text-xs text-slate-500">
          Super admin access uses <code className="rounded bg-base-200 px-1">users.globalRole</code> or{" "}
          <code className="rounded bg-base-200 px-1">FRAG_SUPER_ADMIN_EMAILS</code> in the environment.
        </p>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">My exchanges</h2>
        {myMemberships.length === 0 ? (
          <p className="text-sm text-slate-600">You have not joined any exchanges yet.</p>
        ) : (
          <ul className="space-y-3">
            {myMemberships.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/exchanges/${m.exchange.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
                >
                  <p className="font-semibold" style={{ color: MARKETING_NAVY }}>
                    {m.exchange.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {m.exchange.kind === ExchangeKind.EVENT ? "Event" : "Group"} ·{" "}
                    {m.exchange.visibility === ExchangeVisibility.PUBLIC ? "Public" : "Private"} · Role:{" "}
                    {m.role === "EVENT_MANAGER" ? "Event manager" : "Member"}
                  </p>
                </Link>
              </li>
            ))}
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
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/exchanges/${ex.id}`}
                        className="font-semibold hover:underline"
                        style={{ color: MARKETING_NAVY }}
                      >
                        {ex.name}
                      </Link>
                      <p className="text-xs text-slate-600">
                        {ex.kind === ExchangeKind.EVENT ? "Event" : "Group"} · Public
                      </p>
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
                      <p className="font-semibold hover:underline" style={{ color: MARKETING_NAVY }}>
                        {ex.name}
                      </p>
                      <p className="text-xs text-slate-600">
                        {ex.kind === ExchangeKind.EVENT ? "Event" : "Group"} ·{" "}
                        {ex.visibility === ExchangeVisibility.PUBLIC ? "Public" : "Private"} · {ex.memberships.length}{" "}
                        members
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
