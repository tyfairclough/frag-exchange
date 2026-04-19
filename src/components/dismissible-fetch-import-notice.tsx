"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "reefx:dismiss-fetch-import-notice";

const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) onStoreChange();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(onStoreChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function getSnapshot(): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

function markDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function DismissibleFetchImportNotice() {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (dismissed) return null;

  return (
    <div className="flex h-fit items-center justify-center gap-2 rounded-xl border border-info/30 bg-info/10 p-3 text-sm text-info">
      <p className="min-w-0 flex-1 align-middle leading-snug">
        Imports can take a while. You can safely leave this page; we&apos;ll email you when parsing has finished.
      </p>
      <button
        type="button"
        className="btn btn-ghost btn-xs shrink-0 rounded-lg text-info hover:bg-info/20"
        aria-label="Dismiss notice"
        onClick={markDismissed}
      >
        ✕
      </button>
    </div>
  );
}
