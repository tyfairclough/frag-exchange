"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PublishFetchJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function publishAll() {
    setPublishing(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/my-items/bulk-add/jobs/${jobId}/publish`, { method: "POST" });
      const json = (await res.json()) as { ok: boolean; createdCount?: number; failedCount?: number; error?: string };
      if (!json.ok) {
        setMessage(json.error ?? "Could not publish items.");
        return;
      }
      setMessage(`Published ${json.createdCount ?? 0} items (${json.failedCount ?? 0} failed validations).`);
      window.dispatchEvent(new CustomEvent("reefx-fetch-job-refresh", { detail: { jobId } }));
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  async function rejectAll() {
    if (!window.confirm("Remove all imported rows from this job? This cannot be undone.")) return;
    setRejecting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/my-items/bulk-add/jobs/${jobId}/candidates`, { method: "DELETE" });
      const json = (await res.json()) as { ok: boolean; deletedCount?: number; error?: string };
      if (!json.ok) {
        setMessage(json.error ?? "Could not clear items.");
        return;
      }
      setMessage(json.deletedCount === 0 ? "No items to remove." : `Removed ${json.deletedCount} item(s).`);
      window.dispatchEvent(new CustomEvent("reefx-fetch-job-refresh", { detail: { jobId } }));
      router.refresh();
    } finally {
      setRejecting(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          className="btn btn-error btn-outline btn-sm rounded-xl"
          onClick={() => void rejectAll()}
          disabled={publishing || rejecting}
        >
          {rejecting ? "Removing..." : "Reject"}
        </button>
        <button type="button" className="btn btn-primary btn-sm rounded-xl" onClick={() => void publishAll()} disabled={publishing || rejecting}>
          {publishing ? "Publishing..." : "Publish"}
        </button>
      </div>
      {message ? <p className="max-w-sm text-right text-xs text-warning">{message}</p> : null}
    </div>
  );
}
