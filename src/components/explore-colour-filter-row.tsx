"use client";

import { coralExploreSwatchCheckClass, coralExploreSwatchStyle } from "@/lib/coral-colour-swatch";

type Variant = "inset" | "menu";

export function ExploreColourFilterRow({
  colour,
  checked,
  onToggle,
  variant,
}: {
  colour: string;
  checked: boolean;
  onToggle: () => void;
  variant: Variant;
}) {
  const rowClass =
    variant === "menu"
      ? "flex cursor-pointer items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50"
      : "flex cursor-pointer items-center gap-2 text-sm text-slate-700";

  return (
    <label className={rowClass}>
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
      <span>{colour}</span>
    </label>
  );
}
