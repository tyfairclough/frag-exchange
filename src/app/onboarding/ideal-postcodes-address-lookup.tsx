"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MARKETING_LINK_BLUE, MARKETING_MUTED_BOX, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";

type AddressFormValues = {
  line1: string;
  line2: string;
  town: string;
  region: string;
  postalCode: string;
  countryCode: string;
};

type Suggestion = {
  id: string;
  suggestion: string;
};

export function IdealPostcodesAddressLookup({ initialValues }: { initialValues: AddressFormValues }) {
  const [mode, setMode] = useState<"lookup" | "form">("lookup");

  const [lookupText, setLookupText] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [values, setValues] = useState<AddressFormValues>(initialValues);
  const resolveRequestSeq = useRef(0);

  const trimmedLookup = lookupText.trim();

  useEffect(() => {
    if (mode !== "lookup") return;

    const q = trimmedLookup;
    if (!q || q.length < 3) {
      setSuggestions([]);
      setApiError(null);
      return;
    }

    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        setApiError(null);

        const res = await fetch(`/api/ideal-postcodes/autocomplete?query=${encodeURIComponent(q)}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => null)) as { suggestions?: Suggestion[]; error?: string } | null;
        if (!res.ok || !data?.suggestions) {
          setSuggestions([]);
          setApiError("Address lookup failed. Please try again or use manual input.");
          return;
        }

        setSuggestions(data.suggestions.slice(0, 8));
      } catch (e: unknown) {
        if (typeof e === "object" && e !== null) {
          const name = (e as { name?: unknown }).name;
          if (name === "AbortError") return;
        }
        setSuggestions([]);
        setApiError("Address lookup failed. Please try again or use manual input.");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [mode, trimmedLookup]);

  const dropdownOpen = mode === "lookup" && suggestions.length > 0;

  async function onSelectSuggestion(s: Suggestion) {
    if (!s.id) return;

    const seq = ++resolveRequestSeq.current;
    setLoading(true);
    setApiError(null);

    try {
      const res = await fetch(`/api/ideal-postcodes/resolve?id=${encodeURIComponent(s.id)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data = (await res.json().catch(() => null)) as { address?: Partial<AddressFormValues>; error?: string } | null;
      if (!res.ok || !data?.address) {
        setApiError("Could not resolve that address. Please try another option.");
        return;
      }
      if (seq !== resolveRequestSeq.current) return;

      const a = data.address as Partial<AddressFormValues>;
      setValues({
        line1: String(a.line1 ?? "").trim(),
        line2: String(a.line2 ?? "").trim(),
        town: String(a.town ?? "").trim(),
        region: String(a.region ?? "").trim(),
        postalCode: String(a.postalCode ?? "").trim(),
        countryCode: String(a.countryCode ?? "").trim().toUpperCase() || "GB",
      });
      setMode("form");
    } catch {
      setApiError("Could not resolve that address. Please try another option.");
    } finally {
      setLoading(false);
    }
  }

  const manualValues = useMemo(() => initialValues, [initialValues]);

  function openManualForm() {
    setSuggestions([]);
    setLookupText("");
    setApiError(null);
    setValues(manualValues);
    setMode("form");
  }

  return (
    <div>
      {mode === "lookup" ? (
        <div className="space-y-2 rounded-xl px-3 py-3" style={{ backgroundColor: MARKETING_MUTED_BOX }}>
          <div className="relative">
            <input
              value={lookupText}
              onChange={(e) => setLookupText(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              placeholder="Enter address or postcode"
              aria-label="Address lookup"
              autoComplete="street-address"
            />

            {dropdownOpen ? (
              <div className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <ul className="max-h-72 overflow-auto" role="listbox" aria-label="Address suggestions">
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => onSelectSuggestion(s)}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        {s.suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {apiError ? <div className="text-xs text-red-700">{apiError}</div> : null}

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              openManualForm();
            }}
            className="inline-flex text-sm font-medium"
            style={{ color: MARKETING_LINK_BLUE }}
          >
            Manual input
          </a>
        </div>
      ) : (
        <div className="space-y-2 rounded-xl px-3 py-3" style={{ backgroundColor: MARKETING_MUTED_BOX }}>
          <input
            name="line1"
            value={values.line1}
            onChange={(e) => setValues((v) => ({ ...v, line1: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            placeholder="Address line 1"
          />
          <input
            name="line2"
            value={values.line2}
            onChange={(e) => setValues((v) => ({ ...v, line2: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            placeholder="Address line 2 (optional)"
          />
          <input
            name="town"
            value={values.town}
            onChange={(e) => setValues((v) => ({ ...v, town: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            placeholder="Town / city"
          />
          <input
            name="region"
            value={values.region}
            onChange={(e) => setValues((v) => ({ ...v, region: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            placeholder="County / region (optional)"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              name="postalCode"
              value={values.postalCode}
              onChange={(e) => setValues((v) => ({ ...v, postalCode: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              placeholder="Postal code"
            />
            <input
              name="countryCode"
              value={values.countryCode}
              onChange={(e) => setValues((v) => ({ ...v, countryCode: e.target.value.toUpperCase().slice(0, 2) }))}
              maxLength={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 uppercase"
              placeholder="GB"
              aria-label="Country code"
            />
          </div>
          {loading ? <div className="text-xs" style={{ color: MARKETING_NAVY }}>Looking up…</div> : null}
        </div>
      )}
    </div>
  );
}

