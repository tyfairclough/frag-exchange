"use client";

import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function NewExchangeEventDatePicker() {
  const [kind, setKind] = useState<"EVENT" | "GROUP">("EVENT");
  const [selected, setSelected] = useState<Date | undefined>(undefined);
  const hiddenValue = useMemo(() => (selected ? toInputDate(selected) : ""), [selected]);
  const showEventDate = kind === "EVENT";

  return (
    <div className="space-y-2">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-slate-700">Type</legend>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <input
            type="radio"
            name="kind"
            value="EVENT"
            className="mt-0.5"
            checked={kind === "EVENT"}
            onChange={() => setKind("EVENT")}
          />
          <span className="text-sm text-slate-700">Event (swap day, event managers, check-in later)</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <input
            type="radio"
            name="kind"
            value="GROUP"
            className="mt-0.5"
            checked={kind === "GROUP"}
            onChange={() => setKind("GROUP")}
          />
          <span className="text-sm text-slate-700">Group (ongoing club or region)</span>
        </label>
      </fieldset>

      {showEventDate ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-700">Event date</span>
            {selected ? (
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => setSelected(undefined)}>
                Clear
              </button>
            ) : null}
          </div>

          <div className="rounded-xl border border-base-300 bg-base-100 p-3">
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={setSelected}
              className="w-full"
              classNames={{
                months: "w-full",
                month: "w-full",
                nav: "flex items-center gap-1",
                button_previous: "btn btn-ghost btn-xs",
                button_next: "btn btn-ghost btn-xs",
                caption_label: "text-sm font-semibold text-base-content",
                month_grid: "w-full border-separate border-spacing-y-1",
                weekdays: "text-slate-500",
                weekday: "text-xs font-semibold",
                week: "w-full",
                day: "p-0 text-center",
                day_button:
                  "mx-auto flex h-9 w-9 items-center justify-center rounded-btn text-sm text-base-content transition hover:bg-base-200",
                selected: "bg-primary text-primary-content hover:bg-primary/90",
                today: "ring-1 ring-base-300",
              }}
            />
          </div>

          <input type="hidden" name="eventDate" value={hiddenValue} />
          <span className="block text-xs text-slate-500">
            Required for event exchanges. Used later for trade expiry.
          </span>
        </div>
      ) : null}
    </div>
  );
}
