"use client";

import { useState } from "react";

import { AppLink } from "@/components/app-link";
import { AuroraBrandText } from "@/components/aurora-brand-text";
import {
  MARKETING_CTA_GREEN,
  MARKETING_LINK_BLUE,
  MARKETING_MUTED_BOX,
  MARKETING_NAVY,
  MarketingSiteFooter,
  MarketingSiteHeader,
} from "@/components/marketing/marketing-chrome";
import type { PublicMarketingListingRow } from "@/lib/marketing-listings";

type ListingRow = PublicMarketingListingRow;
type HowItWorksStep = {
  title: string;
  body: string;
  link?: {
    href: string;
    label: string;
  };
};

type HowItWorksTab = {
  id: "frag-swap-events" | "hobbyist-sellers" | "sellers";
  label: string;
  subtitle: string;
  steps: HowItWorksStep[];
};

const HOW_IT_WORKS_TABS: HowItWorksTab[] = [
  {
    id: "frag-swap-events",
    label: "Frag Swap Events",
    subtitle: "Get swapping in less than 10 minutes",
    steps: [
      {
        title: "Attend a reefing event.",
        body: "Your organiser will send you an invite.",
        link: { href: "/exchanges/browse?tab=events", label: "See upcoming events" },
      },
      {
        title: "Join an exchange.",
        body: "Not attending an event? No problem, join an open exchange instead.",
        link: { href: "/exchanges/browse?tab=groups", label: "Join an exchange" },
      },
      {
        title: "List your corals.",
        body: "Describe your coral and add a photo.",
      },
      {
        title: "Search the exchange.",
        body: "Search for corals you would like in your tank.",
      },
      {
        title: "Negotiate an exchange.",
        body: "Send and receive offers that you can accept or reject.",
      },
      {
        title: "Get new coral!",
        body: "Take home new corals for your tank!",
      },
    ],
  },
  {
    id: "hobbyist-sellers",
    label: "Hobbyist Sellers",
    subtitle: "Sell your frags with a simple exchange flow",
    steps: [
      {
        title: "Join an exchange.",
        body: "Choose an exchange to join. Different exchanges cater to different markets.",
      },
      {
        title: "List your items.",
        body: "Add your listings based on each exchange's listing requirements.",
      },
      {
        title: "Respond to reefer requests.",
        body: "Handle incoming requests via the site, SMS, or WhatsApp.",
      },
      {
        title: "Complete your sale.",
        body: "Finalize the sale and hand off your livestock to buyers.",
      },
    ],
  },
  {
    id: "sellers",
    label: "Sellers",
    subtitle: "Turn exchanges into a repeatable growth channel",
    steps: [
      {
        title: "Join an exchange.",
        body: "Choose from any eligible exchange that matches your goals.",
      },
      {
        title: "Build your itinerary automatically.",
        body: "Use the auto listing tool to build your itinerary from your website.",
      },
      {
        title: "Drive traffic to your site.",
        body: "Use your exchange presence to direct reefers back to your storefront.",
      },
      {
        title: "Review dashboard performance.",
        body: "Track outcomes and optimize your strategy from your dashboard.",
      },
    ],
  },
];

function shuffleListings(rows: ListingRow[]): ListingRow[] {
  const shuffled = [...rows];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function ListingCard({ row }: { row: ListingRow }) {
  const { inventoryItem: item, exchange } = row;
  const typeLabel =
    item.kind === "CORAL"
      ? item.coralType?.trim() || "Coral"
      : item.kind === "FISH"
        ? "Fish"
        : "Equipment";

  return (
    <article className="flex w-[min(100%,280px)] shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 sm:w-auto sm:min-w-0 sm:flex-1 sm:snap-none">
      <div className="relative aspect-square w-[42%] min-w-[120px] bg-slate-200 sm:w-2/5">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote hobbyist URLs
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl text-slate-400" aria-hidden>
            🪸
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-3 py-3 sm:px-4">
        <h3 className="truncate text-sm font-bold leading-tight" style={{ color: MARKETING_NAVY }}>
          {item.name}
        </h3>
        <span
          className="w-fit rounded-md px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: "#E8EAF6", color: MARKETING_NAVY }}
        >
          {typeLabel}
        </span>
        <p className="line-clamp-2 text-[0.65rem] leading-snug text-slate-500">{exchange.name}</p>
        <AppLink
          href="/auth/login"
          className="mt-1 text-xs font-semibold hover:underline"
          style={{ color: MARKETING_LINK_BLUE }}
        >
          Sign in to view
        </AppLink>
      </div>
    </article>
  );
}

export function PublicHomepage({ listings }: { listings: ListingRow[] }) {
  const randomizedListings = shuffleListings(listings);
  const [activeHowItWorksTabId, setActiveHowItWorksTabId] = useState<HowItWorksTab["id"]>("frag-swap-events");
  const activeHowItWorksTab =
    HOW_IT_WORKS_TABS.find((tab) => tab.id === activeHowItWorksTabId) ?? HOW_IT_WORKS_TABS[0];

  return (
    <div className="min-h-dvh bg-white text-slate-600">
      <MarketingSiteHeader />

      <section className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 sm:gap-12 sm:px-6 sm:pt-14 lg:grid-cols-2 lg:items-stretch">
        <div className="py-10 sm:py-14">
          <h1
            className="text-[1.65rem] font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]"
            style={{ color: MARKETING_NAVY }}
          >
            Build your reef with{" "}
            <AuroraBrandText className="font-bold tracking-tight" size="lg" textColor={MARKETING_NAVY} />
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Building a marketplace powered by reefers and retailers together.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <AppLink
              href="/exchanges/browse?tab=groups"
              className="inline-flex min-h-12 items-center justify-center rounded-full px-8 text-center text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99]"
              style={{ backgroundColor: MARKETING_CTA_GREEN }}
            >
              Join an exchange
            </AppLink>
            <AppLink
              href="/auth/login"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-8 text-center text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Sign-in
            </AppLink>
          </div>
        </div>
        <div className="relative mx-auto flex w-full max-w-md flex-col justify-end lg:max-w-none">
          <video
            src="https://uploads.reefx.net/videos/coral_composition_640.mp4"
            width={640}
            height={335}
            className="block h-auto w-full object-contain"
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            aria-hidden
          />
        </div>
      </section>

      <section className="py-12 sm:py-16" style={{ backgroundColor: MARKETING_NAVY }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-xl font-semibold text-white sm:text-2xl">
            Live items on REEFxCHANGE
          </h2>
          {listings.length === 0 ? (
            <p className="mx-auto mt-6 max-w-lg text-center text-sm leading-relaxed text-white/80">
              No listings in public exchanges yet. Sign in to join an exchange and list your corals.
            </p>
          ) : (
            <div className="mt-8 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
              {randomizedListings.map((row) => (
                <ListingCard key={row.id} row={row} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="swap-guide" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="text-center text-2xl font-bold sm:text-3xl" style={{ color: MARKETING_NAVY }}>
          How it works
        </h2>
        <div className="mt-6 flex flex-wrap justify-center gap-2" role="tablist" aria-label="How it works use cases">
          {HOW_IT_WORKS_TABS.map((tab) => {
            const isActive = tab.id === activeHowItWorksTab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className="rounded-full border px-4 py-2 text-sm font-semibold transition sm:text-base"
                style={
                  isActive
                    ? {
                        backgroundColor: MARKETING_NAVY,
                        borderColor: MARKETING_NAVY,
                        color: "#fff",
                      }
                    : {
                        backgroundColor: "#fff",
                        borderColor: "#CBD5E1",
                        color: "#334155",
                      }
                }
                onClick={() => setActiveHowItWorksTabId(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <p className="mx-auto mt-4 max-w-xl text-center text-slate-600">{activeHowItWorksTab.subtitle}</p>
        <ol className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {activeHowItWorksTab.steps.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col rounded-2xl p-4 sm:p-5"
              style={{ backgroundColor: MARKETING_MUTED_BOX }}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {i + 1}</span>
              <p className="mt-2 font-semibold" style={{ color: MARKETING_NAVY }}>
                {step.title}
              </p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{step.body}</p>
              {"link" in step && step.link ? (
                <AppLink
                  href={step.link.href}
                  className="mt-3 text-sm font-bold hover:underline"
                  style={{ color: MARKETING_LINK_BLUE }}
                >
                  {step.link.label}
                </AppLink>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section id="pricing" className="border-t border-slate-200 bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-xl font-bold sm:text-2xl" style={{ color: MARKETING_NAVY }}>
            Pricing
          </h2>
          <p className="mt-3 text-slate-600">
            Free for hobbyists. Event organisers can run Frag Swaps and Retailers can promote their listings. — Sign-in
            to learn more.
          </p>
        </div>
      </section>

      <MarketingSiteFooter />
    </div>
  );
}
