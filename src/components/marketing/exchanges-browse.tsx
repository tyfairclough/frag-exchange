import { AppLink } from "@/components/app-link";
import { joinPublicExchangeFormAction } from "@/app/(main)/exchanges/actions";
import type { PublicBrowseEventRow, PublicBrowseGroupRow } from "@/lib/public-exchange-browse";
import { MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";

function formatEventDate(d: Date | null): string {
  if (!d) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function TabLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <AppLink
      href={href}
      className={`pb-2 text-sm font-medium transition-colors sm:text-base ${
        active ? "border-b-[3px]" : "border-b-[3px] border-transparent text-slate-500 hover:text-slate-700"
      }`}
      style={
        active
          ? { color: MARKETING_NAVY, borderBottomColor: MARKETING_LINK_BLUE }
          : undefined
      }
      aria-current={active ? "page" : undefined}
    >
      {label}
    </AppLink>
  );
}

function JoinExchangeControl({
  exchangeId,
  isLoggedIn,
  isMember,
}: {
  exchangeId: string;
  isLoggedIn: boolean;
  isMember: boolean;
}) {
  if (isMember) {
    return (
      <AppLink
        href={`/exchanges/${exchangeId}`}
        className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
        style={{ color: MARKETING_LINK_BLUE }}
      >
        Open
        <span aria-hidden>→</span>
      </AppLink>
    );
  }
  if (isLoggedIn) {
    return (
      <form action={joinPublicExchangeFormAction}>
        <input type="hidden" name="exchangeId" value={exchangeId} />
        <button
          type="submit"
          className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
          style={{ color: MARKETING_LINK_BLUE }}
        >
          Join exchange
          <span aria-hidden>→</span>
        </button>
      </form>
    );
  }
  const loginHref = `/auth/login?next=${encodeURIComponent(`/exchanges/${exchangeId}`)}`;
  return (
    <AppLink
      href={loginHref}
      className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
      style={{ color: MARKETING_LINK_BLUE }}
    >
      Join exchange
      <span aria-hidden>→</span>
    </AppLink>
  );
}

export function ExchangesBrowseView({
  tab,
  events,
  groups,
  joinedIds,
  isLoggedIn,
}: {
  tab: "events" | "groups";
  events: PublicBrowseEventRow[];
  groups: PublicBrowseGroupRow[];
  joinedIds: Set<string>;
  isLoggedIn: boolean;
}) {
  return (
    <div className="bg-slate-100/80 pb-16 pt-6 sm:pb-20 sm:pt-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="rounded-2xl bg-white px-4 py-8 shadow-sm ring-1 ring-slate-200/80 sm:px-8 sm:py-10">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: MARKETING_NAVY }}>
            Exchanges online
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">Check out these exchanges online now.</p>
          <div className="mt-5 border-t border-sky-200/90" />

          <nav className="mt-6 flex gap-8 border-b border-slate-200" aria-label="Exchange type">
            <TabLink href="/exchanges/browse?tab=events" label="Events" active={tab === "events"} />
            <TabLink href="/exchanges/browse?tab=groups" label="Groups" active={tab === "groups"} />
          </nav>

          {tab === "events" ? (
            <EventsTables events={events} />
          ) : (
            <GroupsTables groups={groups} joinedIds={joinedIds} isLoggedIn={isLoggedIn} />
          )}
        </div>
      </div>
    </div>
  );
}

function EventsTables({ events }: { events: PublicBrowseEventRow[] }) {
  if (events.length === 0) {
    return <p className="mt-8 text-sm text-slate-600">No public events listed yet.</p>;
  }

  return (
    <>
      <div className="mt-8 hidden sm:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="pb-3 pr-4 font-semibold">Event</th>
              <th className="pb-3 pr-4 font-semibold">Location</th>
              <th className="pb-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {events.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-0">
                <td className="py-3.5 pr-4 font-medium" style={{ color: MARKETING_NAVY }}>
                  {row.name}
                </td>
                <td className="max-w-xs py-3.5 pr-4 text-slate-600">{row.location}</td>
                <td className="whitespace-nowrap py-3.5 text-slate-600">{formatEventDate(row.eventDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-6 space-y-3 sm:hidden">
        {events.map((row) => (
          <li
            key={row.id}
            className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4"
            style={{ color: MARKETING_NAVY }}
          >
            <p className="font-semibold">{row.name}</p>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium text-slate-500">Location</span> {row.location}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-medium text-slate-500">Date</span> {formatEventDate(row.eventDate)}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

function GroupsTables({
  groups,
  joinedIds,
  isLoggedIn,
}: {
  groups: PublicBrowseGroupRow[];
  joinedIds: Set<string>;
  isLoggedIn: boolean;
}) {
  if (groups.length === 0) {
    return <p className="mt-8 text-sm text-slate-600">No public groups listed yet.</p>;
  }

  return (
    <>
      <div className="mt-8 hidden sm:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="pb-3 pr-4 font-semibold">Exchange</th>
              <th className="pb-3 pr-4 font-semibold">Reefers / Corals</th>
              <th className="pb-3 text-right font-semibold" />
            </tr>
          </thead>
          <tbody>
            {groups.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-0">
                <td className="py-3.5 pr-4 font-medium" style={{ color: MARKETING_NAVY }}>
                  {row.name}
                </td>
                <td className="whitespace-nowrap py-3.5 pr-4 tabular-nums text-slate-600">
                  {row.memberCount}/{row.activeListingCount}
                </td>
                <td className="py-3.5 text-right">
                  <JoinExchangeControl
                    exchangeId={row.id}
                    isLoggedIn={isLoggedIn}
                    isMember={joinedIds.has(row.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-6 space-y-3 sm:hidden">
        {groups.map((row) => (
          <li
            key={row.id}
            className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4"
            style={{ color: MARKETING_NAVY }}
          >
            <p className="font-semibold">{row.name}</p>
            <p className="mt-2 text-sm tabular-nums text-slate-600">
              <span className="font-medium text-slate-500">Reefers / Corals</span> {row.memberCount}/
              {row.activeListingCount}
            </p>
            <div className="mt-3">
              <JoinExchangeControl
                exchangeId={row.id}
                isLoggedIn={isLoggedIn}
                isMember={joinedIds.has(row.id)}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
