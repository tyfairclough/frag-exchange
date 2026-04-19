"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FetchItemsConfigForm() {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState("");
  const [maxPages, setMaxPages] = useState(20);
  const [maxDepth, setMaxDepth] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/my-items/bulk-add/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl, maxPages, maxDepth }),
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
      <div className="grid grid-cols-2 gap-3">
        <label className="form-control">
          <span className="label-text text-sm font-medium">Max pages</span>
          <input
            type="number"
            min={1}
            max={60}
            value={maxPages}
            onChange={(e) => setMaxPages(Number(e.target.value))}
            className="input input-bordered mt-1 w-full rounded-xl"
          />
        </label>
        <label className="form-control">
          <span className="label-text text-sm font-medium">Max depth</span>
          <input
            type="number"
            min={0}
            max={3}
            value={maxDepth}
            onChange={(e) => setMaxDepth(Number(e.target.value))}
            className="input input-bordered mt-1 w-full rounded-xl"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <button type="submit" className="btn btn-primary rounded-xl" disabled={submitting}>
        {submitting ? "Starting..." : "Start bulk add"}
      </button>
    </form>
  );
}
