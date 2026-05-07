import type { Metadata } from "next";
import { ExchangesBrowseView } from "@/components/marketing/exchanges-browse";
import { MarketingSiteFooter, MarketingSiteHeader } from "@/components/marketing/marketing-chrome";
import { ensureDatabaseReady } from "@/lib/db-warm";
import { getPublicBrowseEvents, getPublicBrowseGroups } from "@/lib/public-exchange-browse";

export const metadata: Metadata = {
  title: "Exchanges online",
  description: "Browse public REEFxCHANGE events and groups. Join to list and swap corals.",
};

export const dynamic = "force-dynamic";

export default async function PublicExchangesBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "groups" ? "groups" : "events";

  await ensureDatabaseReady();

  const [events, groups] = await Promise.all([getPublicBrowseEvents(), getPublicBrowseGroups()]);

  return (
    <div className="min-h-dvh bg-white text-slate-600">
      <MarketingSiteHeader />
      <ExchangesBrowseView tab={tab} events={events} groups={groups} />
      <MarketingSiteFooter />
    </div>
  );
}
