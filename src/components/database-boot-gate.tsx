"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DatabaseBootReadyProvider } from "@/components/database-boot-context";

const STORAGE_KEY = "reefx_db_warm_ok_at";

function readClientConfig() {
  const ttlRaw = process.env.NEXT_PUBLIC_REEFX_DB_WARM_CLIENT_TTL_MS;
  const maxRaw = process.env.NEXT_PUBLIC_REEFX_DB_WARM_CLIENT_MAX_MS;
  const ttlMs = ttlRaw ? Number(ttlRaw) : 12 * 60 * 1000;
  const maxMs = maxRaw ? Number(maxRaw) : 50_000;
  return {
    ttlMs: Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 12 * 60 * 1000,
    maxMs: Number.isFinite(maxMs) && maxMs > 0 ? maxMs : 50_000,
  };
}

async function pollHealthUntilOk(maxMs: number): Promise<boolean> {
  const deadline = Date.now() + maxMs;
  let delay = 400;
  while (Date.now() < deadline) {
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (res.ok) {
        return true;
      }
    } catch {
      /* network blip */
    }
    const wait = Math.min(delay, 8000, Math.max(0, deadline - Date.now()));
    if (wait <= 0) {
      break;
    }
    await new Promise((r) => setTimeout(r, wait));
    delay = Math.min(delay * 2, 8000);
  }
  return false;
}

type GateStatus = "checking" | "ready" | "failed";

export function DatabaseBootGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<GateStatus>("checking");

  const runGate = useCallback(() => {
    const { ttlMs, maxMs } = readClientConfig();

    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const t = Number(raw);
        if (Number.isFinite(t) && Date.now() - t < ttlMs) {
          setStatus("ready");
          return;
        }
      }
    } catch {
      /* private mode */
    }

    setStatus("checking");

    void (async () => {
      const ok = await pollHealthUntilOk(maxMs);
      if (ok) {
        try {
          sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
        } catch {
          /* ignore */
        }
        setStatus("ready");
        router.refresh();
      } else {
        setStatus("failed");
      }
    })();
  }, [router]);

  useLayoutEffect(() => {
    // sessionStorage is unavailable during SSR; gate runs once on mount (or on Retry).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external sessionStorage + health I/O
    runGate();
  }, [runGate]);

  const bootReady = status === "ready";
  const showOverlay = status === "checking" || status === "failed";

  return (
    <DatabaseBootReadyProvider ready={bootReady}>
      {children}
      {showOverlay ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-base-100/95 px-6 text-center backdrop-blur-sm"
          role="alertdialog"
          aria-busy={status === "checking"}
          aria-labelledby={status === "checking" ? "db-boot-checking-title" : "db-boot-failed-title"}
          aria-describedby={status === "checking" ? "db-boot-checking-desc" : "db-boot-failed-desc"}
        >
          {status === "checking" ? (
            <>
              <span className="loading loading-spinner loading-lg text-primary" aria-hidden />
              <h2 id="db-boot-checking-title" className="text-lg font-semibold text-base-content">
                Connecting to the database
              </h2>
              <p id="db-boot-checking-desc" className="max-w-sm text-sm text-base-content/70">
                Your data store may be waking from sleep. This usually takes a few seconds.
              </p>
            </>
          ) : (
            <>
              <h2 id="db-boot-failed-title" className="text-lg font-semibold text-base-content">
                Database unavailable
              </h2>
              <p id="db-boot-failed-desc" className="max-w-sm text-sm text-base-content/70">
                We could not reach the database after several attempts. Check your connection or try again in a moment.
              </p>
              <button type="button" className="btn btn-primary rounded-xl px-6" onClick={() => runGate()}>
                Try again
              </button>
            </>
          )}
        </div>
      ) : null}
    </DatabaseBootReadyProvider>
  );
}
