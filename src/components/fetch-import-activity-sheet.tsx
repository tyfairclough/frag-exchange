"use client";

import { InventoryImportEventLevel, InventoryImportJobStatus } from "@/generated/prisma/enums";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type ImportEvent = {
  id: string;
  level: InventoryImportEventLevel;
  stage: string;
  message: string;
  meta: unknown;
  createdAt: string;
};

type JobResponse = {
  id: string;
  status: InventoryImportJobStatus;
  pagesVisited: number;
  pagesParsed: number;
  candidatesReady: number;
  candidatesFailed: number;
  events: ImportEvent[];
};

function getJobIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/my-items\/bulk-add\/([^/]+)$/);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

function levelDot(level: InventoryImportEventLevel) {
  if (level === InventoryImportEventLevel.ERROR) return "bg-error";
  if (level === InventoryImportEventLevel.WARN) return "bg-warning";
  return "bg-success";
}

export function FetchImportActivitySheet() {
  const pathname = usePathname();
  const jobId = useMemo(() => getJobIdFromPath(pathname), [pathname]);
  const [collapsed, setCollapsed] = useState(true);
  const [events, setEvents] = useState<ImportEvent[]>([]);
  const [pagesVisited, setPagesVisited] = useState(0);
  const [pagesParsed, setPagesParsed] = useState(0);
  const [candidatesReady, setCandidatesReady] = useState(0);
  const [candidatesFailed, setCandidatesFailed] = useState(0);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    const tick = async () => {
      const res = await fetch(`/api/my-items/bulk-add/jobs/${jobId}?limit=120`, { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; job?: JobResponse };
      if (!active || !json.ok || !json.job) return;
      setEvents(json.job.events);
      setPagesVisited(json.job.pagesVisited ?? 0);
      setPagesParsed(json.job.pagesParsed ?? 0);
      setCandidatesReady(json.job.candidatesReady ?? 0);
      setCandidatesFailed(json.job.candidatesFailed ?? 0);
    };
    void tick();
    const timer = setInterval(tick, 2200);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [jobId]);

  if (!jobId) return null;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <section className="overflow-hidden rounded-2xl bg-white">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors active:bg-slate-50/80"
          aria-expanded={!collapsed}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Bulk add activity</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
              <span>Visited: {pagesVisited}</span>
              <span>Parsed: {pagesParsed}</span>
              <span>Candidates: {candidatesReady}</span>
              <span>Errors: {candidatesFailed}</span>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500">
            {collapsed ? "Open" : "Hide"}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className={`shrink-0 text-slate-400 transition-transform duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-0 ${collapsed ? "" : "rotate-180"}`}
              aria-hidden
            >
              <path
                d="m6 9 6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
        <div
          className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-0 ${
            collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
          }`}
        >
          <div className="min-h-0">
            <div className="max-h-60 overflow-y-auto border-t border-slate-200 px-3 py-2">
              {events.length === 0 ? (
                <p className="px-1 py-2 text-xs text-slate-500">No activity lines yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {events.map((event) => (
                    <li key={event.id} className="flex items-start gap-2 rounded-lg px-1 py-1">
                      <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${levelDot(event.level)}`} />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-800">{event.message}</p>
                        <p className="text-[11px] text-slate-500">
                          {new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          {" · "}
                          {event.stage}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
