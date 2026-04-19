"use client";

import { InventoryImportJobStatus, InventoryKind } from "@/generated/prisma/enums";
import { useEffect, useState } from "react";

type ExchangeOption = {
  id: string;
  name: string;
  allowCoral: boolean;
  allowFish: boolean;
  allowEquipment: boolean;
  allowItemsForSale: boolean;
};

type CandidateRow = {
  id: string;
  kind: InventoryKind | null;
  name: string | null;
  description: string | null;
  coralType: string | null;
  species: string | null;
  reefSafe: boolean | null;
  quantity: number;
  salePriceMinor: number;
  saleCurrencyCode: string;
  saleExternalUrl: string;
  selectedExchangeIds: string[];
  confidenceScore: number | null;
  sourcePageUrl: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdItemId: string | null;
};

type JobPayload = {
  id: string;
  status: InventoryImportJobStatus;
  pagesVisited: number;
  pagesParsed: number;
  candidatesReady: number;
  candidatesFailed: number;
  candidates: CandidateRow[];
};

export function FetchItemsReviewTable({ initialJob, exchanges }: { initialJob: JobPayload; exchanges: ExchangeOption[] }) {
  const [job, setJob] = useState<JobPayload>(initialJob);
  const [busyCandidateId, setBusyCandidateId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  const isParsing = job.status === InventoryImportJobStatus.QUEUED || job.status === InventoryImportJobStatus.RUNNING;

  useEffect(() => {
    if (!isParsing) return undefined;
    const t = setInterval(async () => {
      const res = await fetch(`/api/my-items/fetch/jobs/${job.id}`, { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; job?: JobPayload };
      if (json.ok && json.job) {
        setJob(json.job);
      }
    }, 2500);
    return () => clearInterval(t);
  }, [isParsing, job.id]);

  async function patchCandidate(candidateId: string, payload: Record<string, unknown>) {
    setBusyCandidateId(candidateId);
    try {
      await fetch(`/api/my-items/fetch/jobs/${job.id}/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const next = await fetch(`/api/my-items/fetch/jobs/${job.id}`, { cache: "no-store" });
      const json = (await next.json()) as { ok: boolean; job?: JobPayload };
      if (json.ok && json.job) {
        setJob(json.job);
      }
    } finally {
      setBusyCandidateId(null);
    }
  }

  async function publishApproved() {
    setPublishing(true);
    setPublishMessage(null);
    try {
      const res = await fetch(`/api/my-items/fetch/jobs/${job.id}/publish`, { method: "POST" });
      const json = (await res.json()) as { ok: boolean; createdCount?: number; failedCount?: number; error?: string };
      if (!json.ok) {
        setPublishMessage(json.error ?? "Could not publish approved items.");
        return;
      }
      setPublishMessage(`Published ${json.createdCount ?? 0} items (${json.failedCount ?? 0} failed validations).`);
      const next = await fetch(`/api/my-items/fetch/jobs/${job.id}`, { cache: "no-store" });
      const nextJson = (await next.json()) as { ok: boolean; job?: JobPayload };
      if (nextJson.ok && nextJson.job) {
        setJob(nextJson.job);
      }
    } finally {
      setPublishing(false);
    }
  }

  return (
    <section className="card border border-base-content/10 bg-base-100 shadow-sm">
      <div className="card-body p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap gap-3 text-base-content/70">
            <span>Status: {job.status}</span>
            <span>Visited: {job.pagesVisited}</span>
            <span>Parsed: {job.pagesParsed}</span>
            <span>Candidates: {job.candidatesReady}</span>
            <span>Errors: {job.candidatesFailed}</span>
          </div>
          <button type="button" className="btn btn-primary btn-sm rounded-xl" onClick={publishApproved} disabled={publishing}>
            {publishing ? "Publishing..." : "Publish approved"}
          </button>
        </div>
        {publishMessage ? <p className="mb-3 text-sm text-base-content/70">{publishMessage}</p> : null}
        <div className="overflow-x-auto">
          <table className="table table-zebra table-sm">
            <thead>
              <tr>
                <th>Approve</th>
                <th>Kind</th>
                <th>Name</th>
                <th>Description</th>
                <th>Price</th>
                <th>Exchanges</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {job.candidates.map((c) => {
                const exchangeOptions = exchanges.filter((ex) => {
                  if (!ex.allowItemsForSale) return false;
                  if (c.kind === InventoryKind.CORAL) return ex.allowCoral;
                  if (c.kind === InventoryKind.FISH) return ex.allowFish;
                  return false;
                });
                return (
                  <tr key={c.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={Boolean(c.approvedAt)}
                        disabled={busyCandidateId === c.id}
                        onChange={(e) => patchCandidate(c.id, { approved: e.target.checked })}
                      />
                    </td>
                    <td>
                      <select
                        className="select select-bordered select-xs w-28 rounded-lg"
                        value={c.kind ?? ""}
                        onChange={(e) => patchCandidate(c.id, { kind: e.target.value })}
                        disabled={busyCandidateId === c.id}
                      >
                        <option value="">--</option>
                        <option value={InventoryKind.CORAL}>Coral</option>
                        <option value={InventoryKind.FISH}>Fish</option>
                      </select>
                    </td>
                    <td>
                      <input
                        className="input input-bordered input-xs w-40 rounded-lg"
                        value={c.name ?? ""}
                        onChange={(e) => patchCandidate(c.id, { name: e.target.value })}
                        disabled={busyCandidateId === c.id}
                      />
                    </td>
                    <td>
                      <textarea
                        className="textarea textarea-bordered textarea-xs h-16 w-64 rounded-lg"
                        value={c.description ?? ""}
                        onChange={(e) => patchCandidate(c.id, { description: e.target.value })}
                        disabled={busyCandidateId === c.id}
                      />
                    </td>
                    <td>
                      <input
                        className="input input-bordered input-xs w-28 rounded-lg"
                        type="number"
                        min={1}
                        value={c.salePriceMinor}
                        onChange={(e) => patchCandidate(c.id, { salePriceMinor: Number(e.target.value) })}
                        disabled={busyCandidateId === c.id}
                      />
                    </td>
                    <td>
                      <select
                        className="select select-bordered select-xs min-w-44 rounded-lg"
                        value=""
                        onChange={(e) => {
                          const id = e.target.value;
                          if (!id) return;
                          if (c.selectedExchangeIds.includes(id)) return;
                          void patchCandidate(c.id, { selectedExchangeIds: [...c.selectedExchangeIds, id] });
                        }}
                        disabled={busyCandidateId === c.id}
                      >
                        <option value="">Add exchange...</option>
                        {exchangeOptions.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.name}
                          </option>
                        ))}
                      </select>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.selectedExchangeIds.map((exchangeId) => {
                          const ex = exchanges.find((it) => it.id === exchangeId);
                          return (
                            <button
                              key={exchangeId}
                              type="button"
                              className="badge badge-outline cursor-pointer"
                              onClick={() =>
                                patchCandidate(c.id, {
                                  selectedExchangeIds: c.selectedExchangeIds.filter((id) => id !== exchangeId),
                                })
                              }
                            >
                              {ex?.name ?? exchangeId} x
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="max-w-56">
                      <a className="link link-primary text-xs" href={c.sourcePageUrl} target="_blank" rel="noreferrer">
                        source
                      </a>
                      <p className="text-xs text-base-content/60">{c.confidenceScore ? `${Math.round(c.confidenceScore * 100)}%` : "-"}</p>
                    </td>
                  </tr>
                );
              })}
              {job.candidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-sm text-base-content/60">
                    No items parsed yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
