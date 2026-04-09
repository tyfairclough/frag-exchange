"use client";

import { useEffect, useRef, useState } from "react";
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
  const copiedTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  async function copyLink() {
    if (copying) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(copyUrl);
      setCopied(true);
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

  const baseClass =
    "inline-flex min-h-9 items-center rounded-full border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100";
  const whatsappClass =
    "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#1fa855] bg-[#25D366] px-3 text-xs font-semibold text-white transition hover:border-[#1a8f49] hover:bg-[#1ebe5d]";
  const facebookClass =
    "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#1664d9] bg-[#1877F2] px-3 text-xs font-semibold text-white transition hover:border-[#145cc8] hover:bg-[#166fe5]";
  const bandClass =
    "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#00b336] bg-[#00C73C] px-3 text-xs font-semibold text-white transition hover:border-[#00a731] hover:bg-[#00bc39]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex min-h-9 items-center px-1 text-xs font-semibold text-slate-600">Share:</span>
      <a href={whatsappUrl} target="_blank" rel="noreferrer" className={whatsappClass}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
          <path d="M20.52 3.48A11.83 11.83 0 0 0 12.03 0C5.42 0 .04 5.37.04 11.99c0 2.11.55 4.18 1.6 6.01L0 24l6.16-1.61a11.9 11.9 0 0 0 5.86 1.5h.01c6.61 0 11.99-5.38 11.99-12a11.9 11.9 0 0 0-3.5-8.41Zm-8.49 18.39h-.01a9.9 9.9 0 0 1-5.03-1.38l-.36-.21-3.66.96.98-3.57-.23-.37a9.92 9.92 0 0 1-1.52-5.3C2.2 6.5 6.54 2.16 12.03 2.16c2.64 0 5.12 1.03 6.98 2.9a9.8 9.8 0 0 1 2.89 6.98c0 5.49-4.34 9.83-9.87 9.83Zm5.41-7.4c-.3-.15-1.76-.87-2.04-.97-.27-.1-.46-.15-.66.15-.2.3-.76.97-.94 1.17-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47a8.87 8.87 0 0 1-1.65-2.05c-.17-.3-.02-.45.13-.6.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.66-1.6-.9-2.2-.24-.58-.48-.5-.66-.5h-.56c-.2 0-.52.07-.8.37-.28.3-1.06 1.03-1.06 2.5s1.09 2.9 1.24 3.1c.15.2 2.12 3.24 5.14 4.55.72.31 1.29.5 1.73.64.73.23 1.38.2 1.9.12.58-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.56-.35Z" />
        </svg>
        <span>WhatsApp</span>
      </a>
      <a href={facebookUrl} target="_blank" rel="noreferrer" className={facebookClass}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
          <path d="M24 12a12 12 0 1 0-13.88 11.86v-8.39H7.08V12h3.04V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.39A12 12 0 0 0 24 12Z" />
        </svg>
        <span>Facebook</span>
      </a>
      <a href={bandUrl} target="_blank" rel="noreferrer" className={bandClass}>
        <span
          aria-hidden="true"
          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold leading-none text-white"
        >
          b
        </span>
        <span>Band</span>
      </a>
      <button type="button" onClick={copyLink} className={`${baseClass} gap-1.5`} disabled={copying}>
        {copied ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
            <path d="m5 12 4 4L19 6" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
            <path d="M10.59 13.41a1.99 1.99 0 0 0 2.82 0l3.18-3.18a2 2 0 1 0-2.83-2.83l-1.06 1.06" />
            <path d="M13.41 10.59a1.99 1.99 0 0 0-2.82 0l-3.18 3.18a2 2 0 1 0 2.83 2.83l1.06-1.06" />
          </svg>
        )}
        <span>{copied ? "Copied" : "Copy link"}</span>
      </button>
    </div>
  );
}
