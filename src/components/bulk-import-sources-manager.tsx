"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InventoryKind } from "@/generated/prisma/enums";

type ExchangeOption = {
  id: string;
  name: string;
  allowCoral: boolean;
  allowFish: boolean;
  allowEquipment: boolean;
  allowItemsForSale: boolean;
};

type SourceRow = {
  id: string;
  sourceUrl: string;
  maxPages: number;
  maxItems: number | null;
  defaultKind: InventoryKind | null;
  defaultExchangeIds: string[];
  autoRefreshEnabled: boolean;
  lastScheduledRunAt: string | null;
  lastScheduledRunError: string | null;
  createdAt: string;
  latestJob: {
    id: string;
    status: string;
    runKind: string;
    createdAt: string;
    finishedAt: string | null;
  } | null;
};

export function BulkImportSourcesManager({ exchanges }: { exchanges: ExchangeOption[] }) {
  const router = useRouter();
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newUrl, setNewUrl] = useState("");
  const [newMaxPages, setNewMaxPages] = useState(2);
  const [newMaxItems, setNewMaxItems] = useState("");
  const [newKind, setNewKind] = useState<string>("");
  const [newExchangeIds, setNewExchangeIds] = useState<Set<string>>(new Set());
  const [newAutoRefresh, setNewAutoRefresh] = useState(false);
  const [newStartScan, setNewStartScan] = useState(true);
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<SourceRow | null>(null);
  const [editMaxPages, setEditMaxPages] = useState(2);
  const [editMaxItems, setEditMaxItems] = useState("");
  const [editKind, setEditKind] = useState<string>("");
  const [editExchangeIds, setEditExchangeIds] = useState<Set<string>>(new Set());
  const [editAutoRefresh, setEditAutoRefresh] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/my-items/bulk-import-sources", { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; sources?: SourceRow[]; error?: string };
      if (!json.ok || !json.sources) {
        setError(json.error ?? "Could not load sources.");
        return;
      }
      setSources(json.sources);
    } catch {
      setError("Could not load sources.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function toggleExchange(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        sourceUrl: newUrl.trim(),
        maxPages: newMaxPages,
        defaultExchangeIds: [...newExchangeIds],
        autoRefreshEnabled: newAutoRefresh,
        startFirstScan: newStartScan,
      };
      const maxTrim = newMaxItems.trim();
      if (maxTrim !== "") {
        const n = Number(maxTrim);
        if (!Number.isFinite(n) || n < 1) {
          setError("Max items must be a positive number or blank.");
          setCreating(false);
          return;
        }
        payload.maxItems = Math.trunc(n);
      } else {
        payload.maxItems = null;
      }
      if (newKind === "CORAL" || newKind === "FISH") {
        payload.defaultKind = newKind;
      } else {
        payload.defaultKind = null;
      }
      const res = await fetch("/api/my-items/bulk-import-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok: boolean; jobId?: string | null; error?: string };
      if (!json.ok) {
        setError(json.error ?? "Could not create source.");
        return;
      }
      setNewUrl("");
      setNewMaxItems("");
      setNewKind("");
      setNewExchangeIds(new Set());
      setNewAutoRefresh(false);
      setNewStartScan(true);
      await refresh();
      if (json.jobId) {
        router.push(`/my-items/bulk-add/${json.jobId}`);
      }
    } catch {
      setError("Could not create source.");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(row: SourceRow) {
    setEditRow(row);
    setEditMaxPages(row.maxPages);
    setEditMaxItems(row.maxItems != null ? String(row.maxItems) : "");
    setEditKind(row.defaultKind ?? "");
    setEditExchangeIds(new Set(row.defaultExchangeIds));
    setEditAutoRefresh(row.autoRefreshEnabled);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editRow) return;
    setSavingEdit(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        maxPages: editMaxPages,
        defaultExchangeIds: [...editExchangeIds],
        autoRefreshEnabled: editAutoRefresh,
      };
      const maxTrim = editMaxItems.trim();
      if (maxTrim !== "") {
        const n = Number(maxTrim);
        if (!Number.isFinite(n) || n < 1) {
          setError("Max items must be a positive number or blank.");
          setSavingEdit(false);
          return;
        }
        payload.maxItems = Math.trunc(n);
      } else {
        payload.maxItems = null;
      }
      if (editKind === "CORAL" || editKind === "FISH") {
        payload.defaultKind = editKind;
      } else {
        payload.defaultKind = null;
      }
      const res = await fetch(`/api/my-items/bulk-import-sources/${editRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error ?? "Could not save.");
        return;
      }
      setEditOpen(false);
      setEditRow(null);
      await refresh();
    } catch {
      setError("Could not save.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function patchAutoRefresh(id: string, enabled: boolean) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/my-items/bulk-import-sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoRefreshEnabled: enabled }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error ?? "Could not update.");
        return;
      }
      await refresh();
    } catch {
      setError("Could not update.");
    } finally {
      setBusyId(null);
    }
  }

  async function runScan(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/my-items/bulk-import-sources/${id}/run`, { method: "POST" });
      const json = (await res.json()) as { ok: boolean; jobId?: string; error?: string };
      if (!json.ok || !json.jobId) {
        setError(json.error ?? "Could not start scan.");
        return;
      }
      router.push(`/my-items/bulk-add/${json.jobId}`);
    } catch {
      setError("Could not start scan.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeSource(id: string) {
    if (!window.confirm("Remove this import source? Weekly refresh stops; existing inventory items stay listed.")) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/my-items/bulk-import-sources/${id}`, { method: "DELETE" });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error ?? "Could not remove.");
        return;
      }
      await refresh();
    } catch {
      setError("Could not remove.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
      ) : null}

      <section className="card border border-base-content/10 bg-base-200/45 shadow-sm">
        <div className="card-body gap-3 p-5">
          <h2 className="text-lg font-semibold text-base-content">Add catalog URL</h2>
          <p className="text-sm text-base-content/70">
            Each URL is crawled separately. Defaults apply to newly parsed rows. Weekly refresh runs at most once per 7 days
            per source when enabled (host must call the bulk-import cron).
          </p>
          <form onSubmit={onCreate} className="flex flex-col gap-3">
            <label className="form-control w-full">
              <span className="label-text text-sm">Starting URL</span>
              <input
                className="input input-bordered rounded-xl"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://yoursite.com/live-stock"
                required
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="form-control">
                <span className="label-text text-sm">Max listing pages</span>
                <input
                  type="number"
                  min={0}
                  max={60}
                  className="input input-bordered rounded-xl"
                  value={newMaxPages}
                  onChange={(e) => setNewMaxPages(Number(e.target.value))}
                />
              </label>
              <label className="form-control">
                <span className="label-text text-sm">Max items (optional)</span>
                <input
                  className="input input-bordered rounded-xl"
                  value={newMaxItems}
                  onChange={(e) => setNewMaxItems(e.target.value)}
                  placeholder="Blank = no limit"
                />
              </label>
            </div>
            <label className="form-control">
              <span className="label-text text-sm">Default type (optional)</span>
              <select
                className="select select-bordered rounded-xl"
                value={newKind}
                onChange={(e) => setNewKind(e.target.value)}
              >
                <option value="">Let AI choose coral vs fish</option>
                <option value="CORAL">Default to coral</option>
                <option value="FISH">Default to fish</option>
              </select>
            </label>
            <fieldset className="rounded-xl border border-base-content/10 p-3">
              <legend className="px-1 text-sm font-medium text-base-content">Default exchanges</legend>
              <p className="mb-2 text-xs text-base-content/60">New import rows get these listings pre-selected.</p>
              <div className="flex flex-col gap-2">
                {exchanges.map((ex) => (
                  <label key={ex.id} className="label cursor-pointer justify-start gap-2">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm rounded"
                      checked={newExchangeIds.has(ex.id)}
                      onChange={() => toggleExchange(setNewExchangeIds, ex.id)}
                    />
                    <span className="label-text text-sm">{ex.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={newAutoRefresh}
                onChange={(e) => setNewAutoRefresh(e.target.checked)}
              />
              <span className="label-text text-sm">Enable weekly automatic refresh after first scan</span>
            </label>
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="checkbox checkbox-sm rounded"
                checked={newStartScan}
                onChange={(e) => setNewStartScan(e.target.checked)}
              />
              <span className="label-text text-sm">Start first crawl immediately</span>
            </label>
            <button type="submit" className="btn btn-primary btn-sm w-fit rounded-xl" disabled={creating}>
              {creating ? "Saving…" : newStartScan ? "Add source and start scan" : "Add source"}
            </button>
          </form>
        </div>
      </section>

      <section className="card border border-base-content/10 bg-base-200/45 shadow-sm">
        <div className="card-body p-5">
          <h2 className="text-lg font-semibold text-base-content">Your sources</h2>
          {loading ? (
            <p className="text-sm text-base-content/60">Loading…</p>
          ) : sources.length === 0 ? (
            <p className="text-sm text-base-content/60">No sources yet. Add a URL above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>URL</th>
                    <th>Defaults</th>
                    <th>Weekly refresh</th>
                    <th>Last run</th>
                    <th>Latest job</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sources.map((s) => (
                    <tr key={s.id}>
                      <td className="max-w-[14rem] truncate text-xs sm:max-w-xs" title={s.sourceUrl}>
                        {s.sourceUrl}
                      </td>
                      <td className="text-xs">
                        {s.defaultKind ?? "AI kind"}
                        {s.defaultExchangeIds.length > 0 ? ` · ${s.defaultExchangeIds.length} exch.` : ""}
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          className="toggle toggle-primary toggle-sm"
                          checked={s.autoRefreshEnabled}
                          disabled={busyId === s.id}
                          onChange={(e) => void patchAutoRefresh(s.id, e.target.checked)}
                        />
                      </td>
                      <td className="text-xs text-base-content/70">
                        {s.lastScheduledRunAt
                          ? new Date(s.lastScheduledRunAt).toLocaleDateString()
                          : "—"}
                        {s.lastScheduledRunError ? (
                          <span className="block text-warning" title={s.lastScheduledRunError}>
                            Warning
                          </span>
                        ) : null}
                      </td>
                      <td className="text-xs">
                        {s.latestJob ? (
                          <Link
                            href={`/my-items/bulk-add/${s.latestJob.id}`}
                            className="link link-primary"
                          >
                            {s.latestJob.status}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs rounded-lg"
                          disabled={busyId === s.id}
                          onClick={() => runScan(s.id)}
                        >
                          Run now
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs rounded-lg"
                          onClick={() => openEdit(s)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-error rounded-lg"
                          disabled={busyId === s.id}
                          onClick={() => void removeSource(s.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {editOpen && editRow ? (
        <dialog
          open
          className="modal modal-middle"
          onClose={() => {
            setEditOpen(false);
            setEditRow(null);
          }}
        >
          <div className="modal-box max-w-lg rounded-2xl">
            <h3 className="text-lg font-semibold">Edit source</h3>
            <p className="mt-1 truncate text-xs text-base-content/60" title={editRow.sourceUrl}>
              {editRow.sourceUrl}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <label className="form-control">
                <span className="label-text text-sm">Max listing pages</span>
                <input
                  type="number"
                  min={0}
                  max={60}
                  className="input input-bordered rounded-xl"
                  value={editMaxPages}
                  onChange={(e) => setEditMaxPages(Number(e.target.value))}
                />
              </label>
              <label className="form-control">
                <span className="label-text text-sm">Max items (optional)</span>
                <input
                  className="input input-bordered rounded-xl"
                  value={editMaxItems}
                  onChange={(e) => setEditMaxItems(e.target.value)}
                  placeholder="Blank = no limit"
                />
              </label>
              <label className="form-control">
                <span className="label-text text-sm">Default type</span>
                <select
                  className="select select-bordered rounded-xl"
                  value={editKind}
                  onChange={(e) => setEditKind(e.target.value)}
                >
                  <option value="">Let AI choose</option>
                  <option value="CORAL">Coral</option>
                  <option value="FISH">Fish</option>
                </select>
              </label>
              <fieldset className="rounded-xl border border-base-content/10 p-3">
                <legend className="px-1 text-sm">Default exchanges</legend>
                <div className="flex flex-col gap-2">
                  {exchanges.map((ex) => (
                    <label key={ex.id} className="label cursor-pointer justify-start gap-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm rounded"
                        checked={editExchangeIds.has(ex.id)}
                        onChange={() => toggleExchange(setEditExchangeIds, ex.id)}
                      />
                      <span className="label-text text-sm">{ex.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={editAutoRefresh}
                  onChange={(e) => setEditAutoRefresh(e.target.checked)}
                />
                <span className="label-text text-sm">Weekly automatic refresh</span>
              </label>
            </div>
            <div className="modal-action">
              <button type="button" className="btn btn-ghost rounded-xl" onClick={() => setEditOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary rounded-xl" disabled={savingEdit} onClick={() => void saveEdit()}>
                {savingEdit ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="submit" aria-label="Close dialog" />
          </form>
        </dialog>
      ) : null}
    </div>
  );
}
