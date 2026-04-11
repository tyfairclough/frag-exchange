import type { Metadata } from "next";
import { ExchangesBrowseView } from "@/components/marketing/exchanges-browse";
import { MarketingSiteFooter, MarketingSiteHeader } from "@/components/marketing/marketing-chrome";
import { getCurrentUser } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db-warm";
import { getPrisma } from "@/lib/db";
import { getPublicBrowseEvents, getPublicBrowseGroups } from "@/lib/public-exchange-browse";

export const metadata: Metadata = {
  title: "Exchanges online",
  description: "Browse public REEFX events and groups. Join to list and swap corals.",
};

export const revalidate = 60;

export default async function PublicExchangesBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "groups" ? "groups" : "events";

  await ensureDatabaseReady();

  const [user, events, groups] = await Promise.all([
    getCurrentUser(),
    getPublicBrowseEvents(),
    getPublicBrowseGroups(),
  ]);

  let joinedIds = new Set<string>();
  if (user && groups.length > 0) {
    const memberships = await getPrisma().exchangeMembership.findMany({
      where: {
        userId: user.id,
        exchangeId: { in: groups.map((g) => g.id) },
      },
      select: { exchangeId: true },
    });
    joinedIds = new Set(memberships.map((m) => m.exchangeId));
  }

  return (
    <div className="min-h-dvh bg-white text-slate-600">
      <MarketingSiteHeader />
      <ExchangesBrowseView
        tab={tab}
        events={events}
        groups={groups}
        joinedIds={joinedIds}
        isLoggedIn={!!user}
      />
      <MarketingSiteFooter />
    </div>
  );
}
