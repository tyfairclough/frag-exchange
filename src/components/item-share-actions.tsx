"use client";

import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

export type ItemShareActionsProps = {
  whatsappUrl: string;
  facebookUrl: string;
  bandUrl: string;
  copyUrl: string;
};

export function ItemShareActions({ whatsappUrl, facebookUrl, bandUrl, copyUrl }: ItemShareActionsProps) {
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  async function copyLink() {
    if (copying) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(copyUrl);
      setCopied(true);
      setMenuOpen(false);
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
      copiedTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 3000);
    } catch {
      toast.error("Could not copy link.");
    } finally {
      setCopying(false);
    }
  }

  const baseMenuItem =
    "flex w-full min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition hover:bg-slate-100";

  const whatsappSegment =
    "inline-flex min-h-9 items-center gap-1.5 border border-[#1fa855] border-r-0 bg-[#25D366] pl-3 pr-2 text-xs font-semibold text-white transition hover:border-[#1a8f49] hover:bg-[#1ebe5d]";

  const caretSegment =
    "inline-flex min-h-9 shrink-0 items-center justify-center border border-[#1fa855] bg-[#25D366] px-2 text-white transition hover:border-[#1a8f49] hover:bg-[#1ebe5d]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex min-h-9 items-center px-1 text-xs font-semibold text-slate-600">Share:</span>
      <div ref={containerRef} className="relative inline-flex min-h-9 max-w-full rounded-full shadow-sm">
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className={`${whatsappSegment} rounded-l-full`}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 fill-current">
            <path d="M20.52 3.48A11.83 11.83 0 0 0 12.03 0C5.42 0 .04 5.37.04 11.99c0 2.11.55 4.18 1.6 6.01L0 24l6.16-1.61a11.9 11.9 0 0 0 5.86 1.5h.01c6.61 0 11.99-5.38 11.99-12a11.9 11.9 0 0 0-3.5-8.41Zm-8.49 18.39h-.01a9.9 9.9 0 0 1-5.03-1.38l-.36-.21-3.66.96.98-3.57-.23-.37a9.92 9.92 0 0 1-1.52-5.3C2.2 6.5 6.54 2.16 12.03 2.16c2.64 0 5.12 1.03 6.98 2.9a9.8 9.8 0 0 1 2.89 6.98c0 5.49-4.34 9.83-9.87 9.83Zm5.41-7.4c-.3-.15-1.76-.87-2.04-.97-.27-.1-.46-.15-.66.15-.2.3-.76.97-.94 1.17-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47a8.87 8.87 0 0 1-1.65-2.05c-.17-.3-.02-.45.13-.6.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.66-1.6-.9-2.2-.24-.58-.48-.5-.66-.5h-.56c-.2 0-.52.07-.8.37-.28.3-1.06 1.03-1.06 2.5s1.09 2.9 1.24 3.1c.15.2 2.12 3.24 5.14 4.55.72.31 1.29.5 1.73.64.73.23 1.38.2 1.9.12.58-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.56-.35Z" />
          </svg>
          <span className="truncate">WhatsApp</span>
        </a>
        <button
          type="button"
          className={`${caretSegment} rounded-r-full border-l border-white/25`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className="sr-only">More share options</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
            <path d="M7 10l5 5 5-5H7z" />
          </svg>
        </button>

        {menuOpen ? (
          <div
            id={menuId}
            role="menu"
            aria-orientation="vertical"
            className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
          >
            <a
              href={facebookUrl}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              className={`${baseMenuItem} text-[#1877F2]`}
              onClick={() => setMenuOpen(false)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 fill-current">
                <path d="M24 12a12 12 0 1 0-13.88 11.86v-8.39H7.08V12h3.04V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.39A12 12 0 0 0 24 12Z" />
              </svg>
              Facebook
            </a>
            <a
              href={bandUrl}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              className={`${baseMenuItem} text-[#00a731]`}
              onClick={() => setMenuOpen(false)}
            >
              <span
                aria-hidden="true"
                className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#00C73C] text-[10px] font-bold leading-none text-white"
              >
                b
              </span>
              Band
            </a>
            <button
              type="button"
              role="menuitem"
              className={`${baseMenuItem} gap-1.5 text-slate-700`}
              onClick={copyLink}
              disabled={copying}
            >
              {copied ? (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 fill-none stroke-current stroke-2">
                  <path d="m5 12 4 4L19 6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 fill-none stroke-current stroke-2">
                  <path d="M10.59 13.41a1.99 1.99 0 0 0 2.82 0l3.18-3.18a2 2 0 1 0-2.83-2.83l-1.06 1.06" />
                  <path d="M13.41 10.59a1.99 1.99 0 0 0-2.82 0l-3.18 3.18a2 2 0 1 0 2.83 2.83l1.06-1.06" />
                </svg>
              )}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
