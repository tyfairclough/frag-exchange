"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { DiscoverRow } from "@/lib/discover-listings";
import { EXPLORE_LISTINGS_PAGE_SIZE } from "@/lib/discover-listings-constants";
import { ExploreResultsGrid } from "./explore-results-grid";

type ApiResponse = {
  total: number;
  listings: DiscoverRow[];
  pageSize: number;
};

function toDate(v: unknown): Date {
  if (v != null && typeof v === "object" && v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date(String(v));
}

function reviveDiscoverRows(raw: unknown[]): DiscoverRow[] {
  return raw.map((item) => {
    const row = item as Record<string, unknown> & DiscoverRow;
    return {
      ...row,
      listedAt: toDate(row.listedAt),
      expiresAt: toDate(row.expiresAt),
    } as DiscoverRow;
  });
}

function mergeByListingId(existing: DiscoverRow[], more: DiscoverRow[]): DiscoverRow[] {
  const seen = new Set(existing.map((r) => r.listingId));
  const out = [...existing];
  for (const r of more) {
    if (seen.has(r.listingId)) continue;
    seen.add(r.listingId);
    out.push(r);
  }
  return out;
}

export function ExploreResultsInfinite({
  initialRows,
  totalCount,
  exchangeId,
}: {
  initialRows: DiscoverRow[];
  totalCount: number;
  exchangeId: string;
}) {
  const searchParams = useSearchParams();
  const queryKey = searchParams.toString();

  const [rows, setRows] = useState<DiscoverRow[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef(initialRows);
  const loadingRef = useRef(false);
  /** After a failed load, skip auto fetch until the user retries (sentinel can stay visible). */
  const autoLoadBlockedRef = useRef(false);

  rowsRef.current = rows;

  useEffect(() => {
    setRows(initialRows);
    rowsRef.current = initialRows;
    setLoading(false);
    setError(null);
    loadingRef.current = false;
    autoLoadBlockedRef.current = false;
  }, [queryKey, initialRows]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    const offset = rowsRef.current.length;
    if (offset >= totalCount) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);
    autoLoadBlockedRef.current = false;
    try {
      const p = new URLSearchParams(searchParams.toString());
      p.set("offset", String(offset));
      const res = await fetch(`/api/explore/listings?${p.toString()}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      const data = (await res.json()) as ApiResponse;
      const next = reviveDiscoverRows(data.listings as unknown[]);
      setRows((prev) => mergeByListingId(prev, next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load more");
      autoLoadBlockedRef.current = true;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [searchParams, totalCount]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || totalCount <= EXPLORE_LISTINGS_PAGE_SIZE) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit && !autoLoadBlockedRef.current) {
          void loadMore();
        }
      },
      { root: null, rootMargin: "240px 0px", threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, totalCount, queryKey]);

  return (
    <div className="space-y-4">
      <ExploreResultsGrid rows={rows} exchangeId={exchangeId} />
      {totalCount > EXPLORE_LISTINGS_PAGE_SIZE ? <div ref={sentinelRef} className="h-1 w-full" aria-hidden /> : null}
      {loading ? (
        <p className="text-center text-sm text-slate-600" aria-live="polite">
          Loading more…
        </p>
      ) : null}
      {error ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
          <button
            type="button"
            className="btn btn-sm btn-outline border-slate-300"
            onClick={() => {
              autoLoadBlockedRef.current = false;
              void loadMore();
            }}
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}
