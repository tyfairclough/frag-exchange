"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FetchItemsConfigForm() {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState("");
  const [maxPages, setMaxPages] = useState(20);
  const [maxItemsRaw, setMaxItemsRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const maxItemsTrim = maxItemsRaw.trim();
      const payload: { sourceUrl: string; maxPages: number; maxItems?: number } = {
        sourceUrl,
        maxPages,
      };
      if (maxItemsTrim !== "") {
        const n = Number(maxItemsTrim);
        if (!Number.isFinite(n) || n < 1) {
          setError("Max items must be a positive number, or leave blank for no limit.");
          setSubmitting(false);
          return;
        }
        payload.maxItems = Math.trunc(n);
      }
      const res = await fetch("/api/my-items/bulk-add/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok: boolean; jobId?: string; error?: string };
      if (!json.ok || !json.jobId) {
        setError(json.error ?? "Could not start import.");
        return;
      }
      router.push(`/my-items/bulk-add/${json.jobId}`);
    } catch {
      setError("Could not start import.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="form-control">
        <span className="label-text text-sm font-medium">Website URL</span>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          required
          placeholder="https://example.com/corals"
          className="input input-bordered mt-1 w-full rounded-xl"
        />
      </label>
      <label className="form-control">
        <span className="label-text text-sm font-medium">Max listing pages</span>
        <input
          type="number"
          min={1}
          max={60}
          value={maxPages}
          onChange={(e) => setMaxPages(Number(e.target.value))}
          className="input input-bordered mt-1 w-full rounded-xl"
        />
        <span className="label-text-alt mt-1 text-xs opacity-70">
          Pagination only (next page links). Product pages linked from those listings are fetched separately — the importer does not crawl the rest of the site.
        </span>
      </label>
      <label className="form-control">
        <span className="label-text text-sm font-medium">Max items (optional)</span>
        <input
          type="number"
          min={1}
          max={2000}
          value={maxItemsRaw}
          onChange={(e) => setMaxItemsRaw(e.target.value)}
          placeholder="No limit"
          className="input input-bordered mt-1 w-full rounded-xl"
        />
        <span className="label-text-alt mt-1 text-xs opacity-70">
          Stop after saving this many coral or fish candidates from listing and product pages. Leave blank to parse until listing pages or the rest of the queue is exhausted.
        </span>
      </label>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <button type="submit" className="btn btn-primary rounded-xl" disabled={submitting}>
        {submitting ? "Starting..." : "Start bulk add"}
      </button>
    </form>
  );
}
