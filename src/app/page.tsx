import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PublicHomepage } from "@/components/marketing/public-homepage";
import { getCurrentUser } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db-warm";
import { getRecentPublicExchangeListings } from "@/lib/marketing-listings";
import { hasCompletedRequiredOnboarding } from "@/lib/onboarding-status";

export const metadata: Metadata = {
  title: "Swap corals with local reefers",
  description:
    "REEFxCHANGE — join public exchanges and reefing events to list, discover, and trade coral frags with fellow hobbyists — free for members.",
};

export const dynamic = "force-dynamic";

export default async function RootHomePage() {
  await ensureDatabaseReady();
  const user = await getCurrentUser();
  if (user) {
    if (!hasCompletedRequiredOnboarding(user)) {
      redirect("/onboarding");
    }
    redirect("/exchanges");
  }

  let listings: Awaited<ReturnType<typeof getRecentPublicExchangeListings>> = [];
  try {
    listings = await getRecentPublicExchangeListings(8);
  } catch (e) {
    console.error("[RootHomePage] getRecentPublicExchangeListings failed:", e);
  }
  return <PublicHomepage listings={listings} />;
}
