"use client";

import { coralExploreSwatchCheckClass, coralExploreSwatchStyle } from "@/lib/coral-colour-swatch";

type Variant = "inset" | "menu";

export function ExploreColourFilterRow({
  colour,
  checked,
  onToggle,
  onOnly,
  variant,
}: {
  colour: string;
  checked: boolean;
  onToggle: () => void;
  onOnly?: () => void;
  variant: Variant;
}) {
  const rowClass =
    variant === "menu"
      ? "flex cursor-pointer items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50"
      : "flex cursor-pointer items-center gap-2 text-sm text-slate-700";
  const rowWithOnlyClass =
    variant === "menu"
      ? "flex items-center justify-between gap-2 px-4 py-2 text-sm hover:bg-slate-50"
      : "flex items-center justify-between gap-2 text-sm text-slate-700";

  const checkboxLabel = (
    <>
      <span className="relative flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={onToggle} />
        <span
          className="pointer-events-none absolute inset-0 rounded border border-slate-400/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-500 peer-checked:ring-2 peer-checked:ring-emerald-600 peer-checked:ring-offset-1"
          style={coralExploreSwatchStyle(colour)}
          aria-hidden
        />
        <svg
          className={`pointer-events-none relative z-[1] h-2.5 w-2.5 opacity-0 peer-checked:opacity-100 ${coralExploreSwatchCheckClass(colour)}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          aria-hidden
        >
          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="truncate">{colour}</span>
    </>
  );

  if (onOnly) {
    return (
      <div className={rowWithOnlyClass}>
        <label className="flex min-w-0 cursor-pointer items-center gap-2">{checkboxLabel}</label>
        <button
          type="button"
          className="shrink-0 cursor-pointer rounded px-1.5 py-0.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          onClick={(e) => {
            e.stopPropagation();
            onOnly();
          }}
          aria-label={`Only ${colour}`}
        >
          Only
        </button>
      </div>
    );
  }

  return (
    <label className={rowClass}>
      {checkboxLabel}
    </label>
  );
}
