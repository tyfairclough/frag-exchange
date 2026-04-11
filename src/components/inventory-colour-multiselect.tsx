"use client";

import { useEffect, useRef, useState } from "react";
import { ExploreColourFilterRow } from "@/components/explore-colour-filter-row";
import { CORAL_COLOURS, isActiveCoralColour, sortCoralPaletteColours } from "@/lib/coral-options";

/** Mirrors explore search colour summary; empty state phrased for inventory forms. */
function summaryInventoryColours(colours: string[]) {
  if (colours.length === 0) {
    return "Select colours";
  }
  if (colours.length > 2) {
    return `+${colours.length} colours selected`;
  }
  return colours.join(", ");
}

export function InventoryColourMultiselect({
  label,
  selected,
  onChange,
}: {
  label: string;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  function toggle(c: string) {
    const next = selected.includes(c)
      ? selected.filter((x) => x !== c)
      : [...selected, c];
    onChange(sortCoralPaletteColours(next));
  }

  function setOnly(c: string) {
    onChange(sortCoralPaletteColours([c]));
  }

  const deprecatedSelected = selected.filter((c) => !isActiveCoralColour(c));

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <fieldset className="form-control w-full">
      <legend className="label-text mb-1 font-medium">{label}</legend>
      <div ref={rootRef} className="relative w-full">
        <button
          type="button"
          className="flex w-full min-h-11 min-w-0 flex-col items-start justify-center rounded-xl border border-slate-200/90 bg-white px-4 py-2 text-left shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className="text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">Colour</span>
          <span className="truncate text-sm text-slate-900">{summaryInventoryColours(selected)}</span>
        </button>
        {open ? (
          <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-lg sm:left-0 sm:right-auto sm:w-64">
            {CORAL_COLOURS.map((c) => (
              <ExploreColourFilterRow
                key={c}
                colour={c}
                checked={selected.includes(c)}
                onToggle={() => toggle(c)}
                onOnly={() => setOnly(c)}
                variant="menu"
              />
            ))}
            {deprecatedSelected.length > 0 ? (
              <>
                <p className="px-4 pb-1 pt-2 text-xs text-slate-500">Previously saved (older palette)</p>
                {deprecatedSelected.map((c) => (
                  <ExploreColourFilterRow
                    key={`legacy-${c}`}
                    colour={c}
                    checked={selected.includes(c)}
                    onToggle={() => toggle(c)}
                    onOnly={() => setOnly(c)}
                    variant="menu"
                  />
                ))}
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      {selected.map((c) => (
        <input key={c} type="hidden" name="colour" value={c} />
      ))}
    </fieldset>
  );
}
