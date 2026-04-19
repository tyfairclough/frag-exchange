"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "reefx:dismiss-fetch-import-notice";

export function DismissibleFetchImportNotice() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") {
        setVisible(false);
      }
    } catch {
      /* ignore */
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="flex h-fit items-center justify-center gap-2 rounded-xl border border-info/30 bg-info/10 p-3 text-sm text-info">
      <p className="min-w-0 flex-1 align-middle leading-snug">
        Imports can take a while. You can safely leave this page; we&apos;ll email you when parsing has finished.
      </p>
      <button
        type="button"
        className="btn btn-ghost btn-xs shrink-0 rounded-lg text-info hover:bg-info/20"
        aria-label="Dismiss notice"
        onClick={() => {
          try {
            localStorage.setItem(STORAGE_KEY, "1");
          } catch {
            /* ignore */
          }
          setVisible(false);
        }}
      >
        ✕
      </button>
    </div>
  );
}
