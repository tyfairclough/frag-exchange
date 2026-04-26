"use client";

import { InventoryImportJobStatus, InventoryKind } from "@/generated/prisma/enums";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FetchReviewBottomSheetBridge } from "@/components/inventory-edit-bottom-nav-context";

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
  imageUrl: string | null;
  rejectedAt: string | null;
  createdItemId: string | null;
};

type JobPayload = {
  id: string;
  status: InventoryImportJobStatus;
  pagesVisited: number;
  pagesParsed: number;
  detailUrlsDiscovered: number;
  detailUrlsProcessed: number;
  candidatesReady: number;
  candidatesFailed: number;
  events: Array<{
    id: string;
    level: "INFO" | "WARN" | "ERROR";
    stage: string;
    message: string;
    createdAt: string;
  }>;
  candidates: CandidateRow[];
};

function formatPriceMinor(minor: number, currencyCode: string) {
  const code = currencyCode?.length === 3 ? currencyCode : "GBP";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: code }).format(minor / 100);
}

function kindLabel(kind: InventoryKind | null) {
  if (kind === InventoryKind.CORAL) return "Coral";
  if (kind === InventoryKind.FISH) return "Fish";
  return "—";
}

function fallbackVisual(kind: InventoryKind | null): { symbol: string; label: string } {
  if (kind === InventoryKind.CORAL) return { symbol: "🪸", label: "Coral placeholder" };
  if (kind === InventoryKind.FISH) return { symbol: "🐟", label: "Fish placeholder" };
  return { symbol: "📦", label: "Item placeholder" };
}

function CandidateImageThumb({ imageUrl, kind }: { imageUrl: string | null; kind: InventoryKind | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const trimmedUrl = imageUrl?.trim() ? imageUrl.trim() : null;
  const showRemote = Boolean(trimmedUrl && failedUrl !== trimmedUrl);
  const fallback = fallbackVisual(kind);

  if (!showRemote) {
    return (
      <span
        className="flex h-10 w-10 items-center justify-center rounded-md border border-base-content/10 bg-base-200 text-sm"
        role="img"
        aria-label={fallback.label}
        title={fallback.label}
      >
        {fallback.symbol}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={trimmedUrl ?? undefined}
      alt=""
      className="h-10 w-10 rounded-md border border-base-content/10 object-cover"
      loading="lazy"
      onError={() => setFailedUrl(trimmedUrl)}
    />
  );
}

export function FetchItemsReviewTable({ initialJob, exchanges }: { initialJob: JobPayload; exchanges: ExchangeOption[] }) {
  const [job, setJob] = useState<JobPayload>(initialJob);
  const [busyCandidateId, setBusyCandidateId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkMergeExchangeId, setBulkMergeExchangeId] = useState("");
  const [bulkKind, setBulkKind] = useState<"" | InventoryKind>("");
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CandidateRow | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const lastToastStatusRef = useRef<InventoryImportJobStatus>(initialJob.status);

  const isParsing = job.status === InventoryImportJobStatus.QUEUED || job.status === InventoryImportJobStatus.RUNNING;
  /** Rows the user has already added (have a createdItemId) disappear from the review table. Deleted rows are hard-removed server-side. */
  const visibleCandidates = job.candidates.filter((c) => !c.createdItemId);
  const discovered = job.detailUrlsDiscovered ?? 0;
  const processed = job.detailUrlsProcessed ?? 0;
  const progressMax = Math.max(discovered, 1);
  const progressPct = discovered > 0 ? Math.min(100, Math.round((processed / discovered) * 100)) : 0;

  useEffect(() => {
    if (!isParsing) return undefined;
    const t = setInterval(async () => {
      const res = await fetch(`/api/my-items/bulk-add/jobs/${job.id}`, { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; job?: JobPayload };
      if (json.ok && json.job) {
        setJob(json.job);
      }
    }, 875);
    return () => clearInterval(t);
  }, [isParsing, job.id]);

  useEffect(() => {
    /** Fire exactly once when the job transitions from a parsing state into a terminal state. */
    const prev = lastToastStatusRef.current;
    if (prev === job.status) return;
    lastToastStatusRef.current = job.status;
    const prevWasParsing =
      prev === InventoryImportJobStatus.QUEUED || prev === InventoryImportJobStatus.RUNNING;
    if (!prevWasParsing) return;
    if (job.status === InventoryImportJobStatus.REVIEW_READY) {
      const count = job.candidatesReady ?? 0;
      toast.success(
        count > 0
          ? `Parsing complete — ${count} item${count === 1 ? "" : "s"} ready to review.`
          : "Parsing complete — no items were confidently found.",
      );
    } else if (job.status === InventoryImportJobStatus.FAILED) {
      toast.error("Parsing failed. Check the activity log for details.");
    }
  }, [job.status, job.candidatesReady]);

  useEffect(() => {
    const el = editDialogRef.current;
    if (!el) return;
    if (editDialogOpen) {
      el.showModal();
    } else {
      el.close();
    }
  }, [editDialogOpen]);

  useEffect(() => {
    if (editId && !job.candidates.some((c) => c.id === editId)) {
      setEditId(null);
      setDraft(null);
      setEditDialogOpen(false);
    }
  }, [editId, job.candidates]);

  useEffect(() => {
    const jid = job.id;
    function onRefresh(e: Event) {
      const ce = e as CustomEvent<{ jobId: string }>;
      if (ce.detail?.jobId !== jid) return;
      void (async () => {
        const next = await fetch(`/api/my-items/bulk-add/jobs/${jid}`, { cache: "no-store" });
        const json = (await next.json()) as { ok: boolean; job?: JobPayload };
        if (json.ok && json.job) {
          setJob(json.job);
        }
      })();
    }
    window.addEventListener("reefx-fetch-job-refresh", onRefresh);
    return () => window.removeEventListener("reefx-fetch-job-refresh", onRefresh);
  }, [job.id]);

  async function refreshJob() {
    const next = await fetch(`/api/my-items/bulk-add/jobs/${job.id}`, { cache: "no-store" });
    const json = (await next.json()) as { ok: boolean; job?: JobPayload };
    if (json.ok && json.job) {
      setJob(json.job);
    }
  }

  async function postBulk(payload: {
    candidateIds: string[];
    approved?: boolean;
    exchangeMode?: "merge" | "replace";
    selectedExchangeIds?: string[];
    kind?: InventoryKind;
    action?: "delete";
  }) {
    setBulkBusy(true);
    try {
      const res = await fetch(`/api/my-items/bulk-add/jobs/${job.id}/candidates/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setPublishMessage(json.error ?? "Bulk action failed.");
        return;
      }
      setPublishMessage(null);
      await refreshJob();
      setSelectedIds(new Set());
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkPublish(ids: string[]) {
    setBulkBusy(true);
    try {
      const res = await fetch(`/api/my-items/bulk-add/jobs/${job.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds: ids }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        createdCount?: number;
        failedCount?: number;
        error?: string;
      };
      if (!json.ok) {
        setPublishMessage(json.error ?? "Could not add selected items.");
        toast.error(json.error ?? "Could not add selected items.");
        return;
      }
      setPublishMessage(null);
      toast.success(
        `Added ${json.createdCount ?? 0} item${(json.createdCount ?? 0) === 1 ? "" : "s"}${
          json.failedCount ? ` (${json.failedCount} failed).` : "."
        }`,
      );
      await refreshJob();
      setSelectedIds(new Set());
    } finally {
      setBulkBusy(false);
    }
  }

  async function patchCandidate(candidateId: string, payload: Record<string, unknown>) {
    setBusyCandidateId(candidateId);
    try {
      await fetch(`/api/my-items/bulk-add/jobs/${job.id}/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await refreshJob();
    } finally {
      setBusyCandidateId(null);
    }
  }

  async function deleteCandidate(candidateId: string) {
    if (!window.confirm("Remove this row from the import?")) return;
    setDeleteBusyId(candidateId);
    try {
      const res = await fetch(`/api/my-items/bulk-add/jobs/${job.id}/candidates/${candidateId}`, { method: "DELETE" });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setPublishMessage(json.error ?? "Could not remove item.");
        return;
      }
      setPublishMessage(null);
      if (editId === candidateId) {
        setEditId(null);
        setDraft(null);
        setEditDialogOpen(false);
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(candidateId);
        return next;
      });
      await refreshJob();
    } finally {
      setDeleteBusyId(null);
    }
  }

  function openEdit(c: CandidateRow) {
    setDraft({ ...c });
    setEditId(c.id);
    setEditDialogOpen(true);
  }

  async function saveEdit() {
    if (!editId || !draft) return;
    if (draft.kind !== InventoryKind.CORAL && draft.kind !== InventoryKind.FISH) {
      setPublishMessage("Choose Coral or Fish before saving.");
      return;
    }
    const cur = draft.saleCurrencyCode.trim().toUpperCase();
    if (cur.length !== 3) {
      setPublishMessage("Enter a 3-letter currency code (e.g. GBP).");
      return;
    }
    await patchCandidate(editId, {
      kind: draft.kind,
      name: draft.name ?? "",
      description: draft.description ?? "",
      salePriceMinor: draft.salePriceMinor,
      saleCurrencyCode: cur,
      saleExternalUrl: draft.saleExternalUrl,
      selectedExchangeIds: draft.selectedExchangeIds,
      quantity: draft.quantity,
    });
    setEditDialogOpen(false);
    setEditId(null);
    setDraft(null);
  }

  const candidateIdList = visibleCandidates.map((c) => c.id);
  const allSelected = candidateIdList.length > 0 && candidateIdList.every((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidateIdList));
    }
  }

  function toggleRowSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const noItemsReason = (() => {
    if (visibleCandidates.length > 0) return null;
    if (isParsing) return "Still crawling and parsing pages. Watch the live activity sheet for each step.";
    if (job.candidates.length > 0 && visibleCandidates.length === 0) {
      return "All parsed items have been handled. Start a new bulk add to import more.";
    }
    if (job.pagesParsed > 0 && job.candidatesReady === 0 && job.candidatesFailed > 0) {
      return "Pages were parsed but AI parsing encountered errors.";
    }
    if (job.pagesParsed > 0 && job.candidatesReady === 0) {
      return "Pages were parsed but no fish/coral listings were confidently detected.";
    }
    return "No items parsed yet.";
  })();

  const draftExchangeOptions =
    draft && exchanges.filter((ex) => {
      if (!ex.allowItemsForSale) return false;
      if (draft.kind === InventoryKind.CORAL) return ex.allowCoral;
      if (draft.kind === InventoryKind.FISH) return ex.allowFish;
      return false;
    });

  return (
    <section className="card border border-base-content/10 bg-base-100 shadow-sm">
      <FetchReviewBottomSheetBridge />
      <div className="card-body p-4">
        {publishMessage ? <p className="mb-3 text-sm text-warning">{publishMessage}</p> : null}
        {(isParsing || discovered > 0) && (
          <div className="mb-3 rounded-xl border border-base-content/10 bg-base-200/30 p-3 text-sm">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-base-content/80">
                {isParsing
                  ? `Parsing in progress — ${processed} of ${discovered || "?"} product pages parsed`
                  : `${discovered} product page${discovered === 1 ? "" : "s"} identified, ${processed} parsed`}
              </p>
              <span className="text-xs text-base-content/60">
                {discovered > 0 ? `${progressPct}%` : "discovering links…"}
              </span>
            </div>
            <progress
              className="progress progress-primary w-full"
              value={processed}
              max={progressMax}
            />
          </div>
        )}
        {visibleCandidates.length > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-base-content/10 bg-base-200/30 p-3 text-sm">
            <p className="text-sm font-medium text-base-content/80">Bulk ({selectedCount} selected)</p>
            <select
              className="select select-bordered select-xs min-w-32 rounded-lg"
              value={bulkKind}
              onChange={(e) => {
                const v = e.target.value;
                setBulkKind(v === InventoryKind.CORAL || v === InventoryKind.FISH ? v : "");
              }}
              disabled={bulkBusy || selectedCount === 0}
            >
              <option value="">Change kind…</option>
              <option value={InventoryKind.CORAL}>Coral</option>
              <option value={InventoryKind.FISH}>Fish</option>
            </select>
            <button
              type="button"
              className="btn btn-outline btn-xs rounded-lg"
              disabled={bulkBusy || selectedCount === 0 || !bulkKind}
              onClick={() => {
                if (!bulkKind) return;
                void postBulk({ candidateIds: [...selectedIds], kind: bulkKind });
              }}
            >
              Apply kind
            </button>
            <select
              className="select select-bordered select-xs min-w-48 rounded-lg"
              value={bulkMergeExchangeId}
              onChange={(e) => setBulkMergeExchangeId(e.target.value)}
              disabled={bulkBusy || selectedCount === 0}
            >
              <option value="">Choose exchange…</option>
              {exchanges
                .filter((ex) => ex.allowItemsForSale)
                .map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
            </select>
            <button
              type="button"
              className="btn btn-outline btn-xs rounded-lg"
              disabled={bulkBusy || selectedCount === 0 || !bulkMergeExchangeId}
              onClick={() => {
                if (!bulkMergeExchangeId) return;
                void postBulk({
                  candidateIds: [...selectedIds],
                  exchangeMode: "merge",
                  selectedExchangeIds: [bulkMergeExchangeId],
                });
              }}
            >
              Add exchange
            </button>
            <span className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline btn-error btn-xs rounded-lg"
                disabled={bulkBusy || selectedCount === 0}
                onClick={() => {
                  if (selectedCount === 0) return;
                  if (!window.confirm(`Remove ${selectedCount} selected item(s) from this import?`)) return;
                  void postBulk({ candidateIds: [...selectedIds], action: "delete" });
                }}
              >
                Remove
              </button>
              <button
                type="button"
                className="btn btn-primary btn-xs rounded-lg"
                disabled={bulkBusy || selectedCount === 0}
                onClick={() => {
                  if (selectedCount === 0) return;
                  void bulkPublish([...selectedIds]);
                }}
              >
                Add to inventory
              </button>
            </span>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="table table-zebra table-sm">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={allSelected}
                    onChange={() => toggleSelectAll()}
                    disabled={bulkBusy || visibleCandidates.length === 0}
                    title="Select all"
                  />
                </th>
                <th>Image</th>
                <th>Kind</th>
                <th>Name</th>
                <th>Description</th>
                <th>Price</th>
                <th>Exchanges</th>
                <th>Source</th>
                <th className="w-36"> </th>
              </tr>
            </thead>
            <tbody>
              {visibleCandidates.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleRowSelected(c.id)}
                        disabled={bulkBusy}
                      />
                    </td>
                    <td>
                      <CandidateImageThumb imageUrl={c.imageUrl} kind={c.kind} />
                    </td>
                    <td className="whitespace-nowrap text-sm">{kindLabel(c.kind)}</td>
                    <td className="max-w-40">
                      <span className="line-clamp-2 text-sm">{c.name ?? "—"}</span>
                    </td>
                    <td className="max-w-64">
                      {c.description?.trim() ? (
                        <span className="line-clamp-3 text-sm text-base-content/90">{c.description}</span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap text-sm">{formatPriceMinor(c.salePriceMinor, c.saleCurrencyCode)}</td>
                    <td>
                      <div className="flex max-w-48 flex-wrap gap-1">
                        {c.selectedExchangeIds.length === 0 ? (
                          <span className="text-xs text-base-content/40">—</span>
                        ) : (
                          c.selectedExchangeIds.map((exchangeId) => {
                            const ex = exchanges.find((it) => it.id === exchangeId);
                            return (
                              <span key={exchangeId} className="badge badge-outline badge-sm">
                                {ex?.name ?? exchangeId}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>
                    <td className="max-w-56">
                      <a className="link link-primary text-xs" href={c.sourcePageUrl} target="_blank" rel="noreferrer">
                        source
                      </a>
                      <p className="text-xs text-base-content/60">{c.confidenceScore ? `${Math.round(c.confidenceScore * 100)}%` : "-"}</p>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs rounded-lg"
                          disabled={busyCandidateId === c.id || bulkBusy || deleteBusyId === c.id}
                          onClick={() => openEdit(c)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs rounded-lg text-error hover:bg-error/10"
                          disabled={busyCandidateId === c.id || bulkBusy || deleteBusyId === c.id}
                          onClick={() => void deleteCandidate(c.id)}
                        >
                          {deleteBusyId === c.id ? "…" : "Remove"}
                        </button>
                      </div>
                    </td>
                  </tr>
              ))}
              {visibleCandidates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-sm text-base-content/60">
                    {noItemsReason}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <dialog
        ref={editDialogRef}
        className="modal modal-middle"
        onClose={() => {
          setEditDialogOpen(false);
          setEditId(null);
          setDraft(null);
        }}
      >
        {draft ? (
          <div className="modal-box flex max-h-[min(90dvh,40rem)] w-full max-w-lg flex-col gap-3 p-5 text-left">
            <h2 className="text-lg font-semibold text-base-content">Edit item</h2>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
              <label className="form-control w-full">
                <span className="label-text text-xs text-base-content/70">Kind</span>
                <select
                  className="select select-bordered select-sm rounded-lg"
                  value={draft.kind ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            kind: v === InventoryKind.CORAL || v === InventoryKind.FISH ? (v as InventoryKind) : null,
                          }
                        : d,
                    );
                  }}
                  disabled={busyCandidateId === editId}
                >
                  <option value="">--</option>
                  <option value={InventoryKind.CORAL}>Coral</option>
                  <option value={InventoryKind.FISH}>Fish</option>
                </select>
              </label>
              <label className="form-control w-full">
                <span className="label-text text-xs text-base-content/70">Name</span>
                <input
                  className="input input-bordered input-sm rounded-lg"
                  value={draft.name ?? ""}
                  onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                  disabled={busyCandidateId === editId}
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text text-xs text-base-content/70">Description</span>
                <textarea
                  className="textarea textarea-bordered textarea-sm min-h-24 rounded-lg"
                  value={draft.description ?? ""}
                  onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))}
                  disabled={busyCandidateId === editId}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <label className="form-control min-w-[8rem] flex-1">
                  <span className="label-text text-xs text-base-content/70">Price (minor units)</span>
                  <input
                    className="input input-bordered input-sm rounded-lg"
                    type="number"
                    min={1}
                    value={draft.salePriceMinor}
                    onChange={(e) =>
                      setDraft((d) => (d ? { ...d, salePriceMinor: Math.max(1, Number(e.target.value) || 1) } : d))
                    }
                    disabled={busyCandidateId === editId}
                  />
                </label>
                <label className="form-control min-w-[6rem] flex-1">
                  <span className="label-text text-xs text-base-content/70">Currency</span>
                  <input
                    className="input input-bordered input-sm rounded-lg uppercase"
                    maxLength={3}
                    value={draft.saleCurrencyCode}
                    onChange={(e) =>
                      setDraft((d) => (d ? { ...d, saleCurrencyCode: e.target.value.toUpperCase().slice(0, 3) } : d))
                    }
                    disabled={busyCandidateId === editId}
                  />
                </label>
              </div>
              <p className="text-xs text-base-content/50">
                Preview: {formatPriceMinor(draft.salePriceMinor, draft.saleCurrencyCode)}
              </p>
              <label className="form-control w-full">
                <span className="label-text text-xs text-base-content/70">Sale URL</span>
                <input
                  className="input input-bordered input-sm rounded-lg"
                  value={draft.saleExternalUrl}
                  onChange={(e) => setDraft((d) => (d ? { ...d, saleExternalUrl: e.target.value } : d))}
                  disabled={busyCandidateId === editId}
                />
              </label>
              <div>
                <span className="label-text text-xs text-base-content/70">Exchanges</span>
                <select
                  className="select select-bordered select-sm mt-1 w-full rounded-lg"
                  value=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id || !draft) return;
                    if (draft.selectedExchangeIds.includes(id)) return;
                    setDraft((d) => (d ? { ...d, selectedExchangeIds: [...d.selectedExchangeIds, id] } : d));
                  }}
                  disabled={busyCandidateId === editId}
                >
                  <option value="">Add exchange...</option>
                  {draftExchangeOptions?.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex flex-wrap gap-1">
                  {draft.selectedExchangeIds.map((exchangeId) => {
                    const ex = exchanges.find((it) => it.id === exchangeId);
                    return (
                      <button
                        key={exchangeId}
                        type="button"
                        className="badge badge-outline cursor-pointer gap-1"
                        onClick={() =>
                          setDraft((d) =>
                            d
                              ? { ...d, selectedExchangeIds: d.selectedExchangeIds.filter((x) => x !== exchangeId) }
                              : d,
                          )
                        }
                        disabled={busyCandidateId === editId}
                      >
                        {ex?.name ?? exchangeId} ×
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="modal-action mt-2 flex flex-wrap gap-2 border-t border-base-content/10 pt-3">
              <button type="button" className="btn btn-ghost rounded-lg" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary rounded-lg"
                disabled={busyCandidateId === editId}
                onClick={() => void saveEdit()}
              >
                {busyCandidateId === editId ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : null}
        <form method="dialog" className="modal-backdrop">
          <button type="submit" aria-label="Close dialog" />
        </form>
      </dialog>
    </section>
  );
}
