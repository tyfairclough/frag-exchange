"use client";

import { useState, type ReactNode } from "react";

export type ListingsTabId = "listings" | "unlisted";

export function ExchangeMemberListingsTabs({
  initialTab,
  listingsCount,
  unlistedCount,
  listingsPanel,
  unlistedPanel,
}: {
  initialTab: ListingsTabId;
  listingsCount: number;
  unlistedCount: number;
  listingsPanel: ReactNode;
  unlistedPanel: ReactNode;
}) {
  const [tab, setTab] = useState<ListingsTabId>(initialTab);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Listing views"
        className="tabs tabs-border tabs-md mb-4 min-w-0 flex-nowrap overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          role="tab"
          id="tab-listings"
          aria-selected={tab === "listings"}
          aria-controls="panel-listings"
          tabIndex={tab === "listings" ? 0 : -1}
          className={`tab shrink-0 whitespace-nowrap font-semibold${tab === "listings" ? " tab-active" : ""}`}
          onClick={() => setTab("listings")}
        >
          Your listings
          <span className="ml-1.5 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 tabular-nums">
            {listingsCount}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-unlisted"
          aria-selected={tab === "unlisted"}
          aria-controls="panel-unlisted"
          tabIndex={tab === "unlisted" ? 0 : -1}
          className={`tab shrink-0 whitespace-nowrap font-semibold${tab === "unlisted" ? " tab-active" : ""}`}
          onClick={() => setTab("unlisted")}
        >
          Unlisted
          <span className="ml-1.5 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 tabular-nums">
            {unlistedCount}
          </span>
        </button>
      </div>

      <div role="tabpanel" id="panel-listings" aria-labelledby="tab-listings" hidden={tab !== "listings"}>
        {listingsPanel}
      </div>
      <div role="tabpanel" id="panel-unlisted" aria-labelledby="tab-unlisted" hidden={tab !== "unlisted"}>
        {unlistedPanel}
      </div>
    </div>
  );
}
