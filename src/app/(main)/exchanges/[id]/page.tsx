import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CoralProfileStatus,
  ExchangeKind,
  ExchangeMembershipRole,
  ExchangeVisibility,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  canIssuePrivateInvite,
  canManageEventDesk,
  canPromoteEventManager,
  canSeeMemberRoster,
  canViewExchangeDirectory,
  isSuperAdmin,
} from "@/lib/super-admin";
import {
  demoteEventManagerFormAction,
  joinPublicExchangeFormAction,
  promoteEventManagerFormAction,
} from "@/app/(main)/exchanges/actions";
import {
  addExchangeListingFormAction,
  removeExchangeListingFormAction,
} from "@/app/(main)/exchanges/listing-actions";
import { PrivateInviteForm } from "@/app/(main)/exchanges/components/private-invite-form";
import { DeleteExchangeButton } from "@/app/(main)/exchanges/components/delete-exchange-button";
import { MARKETING_CTA_GREEN, MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";

const detailErrors: Record<string, string> = {
  forbidden: "You do not have permission for that action.",
  "promote-invalid": "That member cannot be promoted right now.",
  "demote-invalid": "That manager cannot be demoted right now.",
  "listing-forbidden": "Join this exchange before listing corals here.",
  "listing-coral": "That coral cannot be listed on this exchange.",
  "listing-invalid": "That listing request was incomplete.",
};

export default async function ExchangeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    joined?: string;
    promoted?: string;
    demoted?: string;
    updated?: string;
    error?: string;
    listed?: string;
    unlisted?: string;
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
  const roster = canSeeMemberRoster(exchange, membership, user);
  const invitePower = canIssuePrivateInvite(exchange, membership, user);
  const promotePower = canPromoteEventManager(exchange, user);
  const eventDesk = canManageEventDesk(exchange, membership, user);
  const superUser = isSuperAdmin(user);

  const errorMessage = sp.error ? detailErrors[sp.error] ?? "Something went wrong." : null;

  const now = new Date();
  const myListableCorals =
    membership && canView
      ? await getPrisma().coral.findMany({
          where: { userId: user.id, profileStatus: CoralProfileStatus.UNLISTED },
          orderBy: { updatedAt: "desc" },
        })
      : [];
  const myListingsHere =
    membership && canView
      ? await getPrisma().exchangeListing.findMany({
          where: {
            exchangeId: exchange.id,
            coral: { userId: user.id },
          },
          include: { coral: true },
          orderBy: { listedAt: "desc" },
        })
      : [];
  const activeListingByCoralId = new Map(
    myListingsHere.filter((l) => l.expiresAt > now).map((l) => [l.coralId, l]),
  );

  if (!canView) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/exchanges"
          className="inline-flex min-h-10 w-fit items-center rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
        >
          All exchanges
        </Link>
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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/exchanges"
        className="inline-flex min-h-10 w-fit items-center rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
      >
        All exchanges
      </Link>

      {sp.joined === "1" || sp.joined === "invite" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {sp.joined === "invite" ? "You joined using an invite." : "You are now a member of this exchange."}
        </div>
      ) : null}

      {sp.promoted === "1" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Member promoted to event manager.
        </div>
      ) : null}

      {sp.demoted === "1" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Event manager demoted to member.
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

      {sp.listed === "1" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Coral listed on this exchange (90-day window). Others can find it in Explore.
        </div>
      ) : null}

      {sp.unlisted === "1" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Coral removed from this exchange.
        </div>
      ) : null}

      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
            {exchange.name}
          </h1>
          {superUser ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/exchanges/${exchange.id}/edit`}
                className="inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Edit
              </Link>
              <DeleteExchangeButton exchangeId={exchange.id} exchangeName={exchange.name} />
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
            {exchange.kind === ExchangeKind.EVENT ? "Event" : "Group"}
          </span>
          <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
            {exchange.visibility === ExchangeVisibility.PUBLIC ? "Public" : "Private"}
          </span>
          {membership ? (
            <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ backgroundColor: MARKETING_LINK_BLUE }}>
              {membership.role === ExchangeMembershipRole.EVENT_MANAGER ? "Event manager" : "Member"}
            </span>
          ) : null}
        </div>
        {exchange.description ? <p className="text-sm leading-relaxed text-slate-600">{exchange.description}</p> : null}
        {exchange.kind === ExchangeKind.EVENT && exchange.eventDate ? (
          <p className="text-sm text-slate-600">
            Event date:{" "}
            <time dateTime={exchange.eventDate.toISOString()}>
              {exchange.eventDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </time>
          </p>
        ) : null}
        {exchange.kind === ExchangeKind.EVENT && canView && (membership || eventDesk) ? (
          <div className="flex flex-wrap gap-2">
            {membership ? (
              <Link
                href={`/exchanges/${encodeURIComponent(exchange.id)}/event-pickup`}
                className="inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Event pickup
              </Link>
            ) : null}
            {eventDesk ? (
              <Link
                href={`/exchanges/${encodeURIComponent(exchange.id)}/event-ops`}
                className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold text-white transition hover:opacity-95"
                style={{ backgroundColor: MARKETING_LINK_BLUE }}
              >
                Event desk
              </Link>
            ) : null}
          </div>
        ) : null}
      </header>

      {!membership && exchange.visibility === ExchangeVisibility.PUBLIC ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
          <div className="flex flex-row flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-700">Join this public exchange to list corals and browse other members.</p>
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
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold" style={{ color: MARKETING_NAVY }}>
                  Your listings here
                </h2>
                <p className="text-xs text-slate-500">
                  Profile corals can sit on multiple exchanges until a trade completes. Each listing expires after 90 days
                  (renew by listing again).
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/explore?exchangeId=${encodeURIComponent(exchange.id)}`}
                  className="inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                >
                  Explore this exchange
                </Link>
                <Link
                  href={`/exchanges/${encodeURIComponent(exchange.id)}/trades`}
                  className="inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                >
                  Trades
                </Link>
              </div>
            </div>

            {activeListingByCoralId.size === 0 ? (
              <p className="text-sm text-slate-600">No active listings on this exchange yet.</p>
            ) : (
              <ul className="space-y-2">
                {[...activeListingByCoralId.values()].map((l) => (
                  <li
                    key={l.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium" style={{ color: MARKETING_NAVY }}>
                        {l.coral.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Listed until{" "}
                        <time dateTime={l.expiresAt.toISOString()}>
                          {l.expiresAt.toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </time>
                      </p>
                    </div>
                    <form action={removeExchangeListingFormAction}>
                      <input type="hidden" name="exchangeId" value={exchange.id} />
                      <input type="hidden" name="coralId" value={l.coralId} />
                      <button
                        type="submit"
                        className="inline-flex min-h-9 items-center rounded-full border border-rose-300 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">List a coral</h3>
              {myListableCorals.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">
                  Add corals under{" "}
                  <Link href="/my-corals" className="font-semibold hover:underline" style={{ color: MARKETING_LINK_BLUE }}>
                    My corals
                  </Link>{" "}
                  first.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {myListableCorals.map((c) => {
                    const active = activeListingByCoralId.get(c.id);
                    return (
                      <li
                        key={c.id}
                        className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-medium" style={{ color: MARKETING_NAVY }}>
                            {c.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {active ? "Already listed (active)." : "Not listed here, or listing expired — you can list again."}
                          </p>
                        </div>
                        {active ? (
                          <span className="w-fit rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            Active
                          </span>
                        ) : (
                          <form action={addExchangeListingFormAction}>
                            <input type="hidden" name="exchangeId" value={exchange.id} />
                            <input type="hidden" name="coralId" value={c.id} />
                            <button
                              type="submit"
                              className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold text-white transition hover:opacity-95"
                              style={{ backgroundColor: MARKETING_CTA_GREEN }}
                            >
                              List here
                            </button>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {roster ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Member roster</h2>
          <p className="text-xs text-slate-500">Shown to super admins and event managers on event exchanges.</p>
          <ul className="space-y-2">
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
                    {m.role === ExchangeMembershipRole.EVENT_MANAGER ? "Event manager" : "Member"}
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
                      Demote to member
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {invitePower ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold" style={{ color: MARKETING_NAVY }}>
              Invites (private)
            </h2>
            <p className="text-xs text-slate-500">
              Super admins and event managers can generate single-use links. The invitee must use the same email when
              signing in.
            </p>
            <PrivateInviteForm exchangeId={exchange.id} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
