"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useExploreShell } from "@/components/explore-shell-context";
import { ExploreColourFilterRow } from "@/components/explore-colour-filter-row";
import {
  buildExploreSearchHref,
  parseExploreFiltersFromSearchParams,
  type ExploreFilterState,
} from "@/lib/explore-search-href";

type MenuKey = "type" | "colour" | "keyword" | "filters";

type MobileSection = "keyword" | "type" | "colour";

function labelKeyword(v: string) {
  return v.trim() ? v : "Any keyword";
}

function allTypesSelected(types: string[], allOptions: readonly string[]) {
  if (allOptions.length === 0) {
    return types.length === 0;
  }
  return (
    types.length === 0 ||
    (types.length === allOptions.length && allOptions.every((x) => types.includes(x)))
  );
}

function summaryTypes(types: string[], allOptions: readonly string[]) {
  if (allTypesSelected(types, allOptions)) {
    return "All types";
  }
  return allOptions.filter((x) => types.includes(x)).join(", ");
}

function typeCheckboxChecked(types: string[], allOptions: readonly string[], t: string) {
  return allTypesSelected(types, allOptions) || types.includes(t);
}

function summaryColours(colours: string[]) {
  if (colours.length === 0) {
    return "All colours";
  }
  if (colours.length > 2) {
    return `+${colours.length} colours selected`;
  }
  return colours.join(", ");
}

function emptyExploreFilters(): ExploreFilterState {
  return {
    q: "",
    coralTypes: [],
    colours: [],
    freeOnly: false,
    fulfilment: "",
    maxKm: "",
  };
}

const NO_CORAL_TYPE_OPTIONS: readonly string[] = [];

export function ExploreHeaderChrome() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { model } = useExploreShell();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchModalRef = useRef<HTMLDivElement>(null);
  const filtersModalRef = useRef<HTMLDivElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const modalHistoryRef = useRef(0);

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [expanded, setExpanded] = useState<MobileSection | null>("keyword");
  const [draft, setDraft] = useState<ExploreFilterState>(() =>
    parseExploreFiltersFromSearchParams(new URLSearchParams()),
  );
  const [draftExchangeId, setDraftExchangeId] = useState("");

  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    const next = parseExploreFiltersFromSearchParams(sp);
    queueMicrotask(() => {
      setDraft(next);
    });
  }, [searchParams]);

  useEffect(() => {
    const id = model?.exchangeId;
    if (!id) {
      return;
    }
    queueMicrotask(() => {
      setDraftExchangeId(id);
    });
  }, [model?.exchangeId]);

  useEffect(() => {
    const onPop = () => {
      setMobileSearchOpen(false);
      setMobileFiltersOpen(false);
      modalHistoryRef.current = Math.max(0, modalHistoryRef.current - 1);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const pushModalHistory = useCallback(() => {
    window.history.pushState({ exploreUi: true }, "", window.location.href);
    modalHistoryRef.current += 1;
  }, []);

  const dismissModalOverlay = useCallback(() => {
    if (modalHistoryRef.current > 0) {
      window.history.back();
    } else {
      setMobileSearchOpen(false);
      setMobileFiltersOpen(false);
    }
    setTimeout(() => lastTriggerRef.current?.focus(), 0);
  }, []);

  const navigateAfterClosingOverlay = useCallback(
    (href: string) => {
      setOpenMenu(null);
      if (modalHistoryRef.current > 0) {
        window.history.back();
        queueMicrotask(() => router.push(href));
      } else {
        router.push(href);
      }
    },
    [router],
  );

  useEffect(() => {
    if (!openMenu) {
      return;
    }
    const onDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) {
        return;
      }
      setOpenMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openMenu]);

  const overlayOpen = mobileSearchOpen || mobileFiltersOpen;

  useEffect(() => {
    if (!overlayOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [overlayOpen]);

  useEffect(() => {
    if (!mobileSearchOpen) {
      return;
    }
    const el = searchModalRef.current;
    if (!el) {
      return;
    }
    const focusables = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const list = [...focusables].filter((n) => !n.hasAttribute("disabled") && n.offsetParent !== null);
    const first = list[0];
    const last = list[list.length - 1];
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismissModalOverlay();
        return;
      }
      if (e.key !== "Tab" || list.length === 0) {
        return;
      }
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileSearchOpen, dismissModalOverlay]);

  useEffect(() => {
    if (!mobileFiltersOpen) {
      return;
    }
    const el = filtersModalRef.current;
    if (!el) {
      return;
    }
    const focusables = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const list = [...focusables].filter((n) => !n.hasAttribute("disabled") && n.offsetParent !== null);
    const first = list[0];
    const last = list[list.length - 1];
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismissModalOverlay();
        return;
      }
      if (e.key !== "Tab" || list.length === 0) {
        return;
      }
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileFiltersOpen, dismissModalOverlay]);

  const openMobileSearch = useCallback(
    (el: HTMLElement | null) => {
      lastTriggerRef.current = el;
      pushModalHistory();
      setMobileFiltersOpen(false);
      setMobileSearchOpen(true);
      setExpanded("keyword");
    },
    [pushModalHistory],
  );

  const openMobileFilters = useCallback(
    (el: HTMLElement | null) => {
      lastTriggerRef.current = el;
      pushModalHistory();
      setMobileSearchOpen(false);
      setMobileFiltersOpen(true);
    },
    [pushModalHistory],
  );

  const coralTypeOptions = model?.coralTypes ?? NO_CORAL_TYPE_OPTIONS;
  const toggleDraftType = useCallback(
    (t: string) => {
      setDraft((d) => {
        const all = coralTypeOptions;
        if (all.length === 0) {
          const next = new Set(d.coralTypes);
          if (next.has(t)) {
            next.delete(t);
          } else {
            next.add(t);
          }
          return { ...d, coralTypes: [...next] };
        }
        if (allTypesSelected(d.coralTypes, all)) {
          return { ...d, coralTypes: all.filter((x) => x !== t) };
        }
        const set = new Set(d.coralTypes);
        if (set.has(t)) {
          set.delete(t);
        } else {
          set.add(t);
        }
        let nextTypes = [...set];
        if (nextTypes.length === all.length && all.every((x) => nextTypes.includes(x))) {
          nextTypes = [];
        }
        return { ...d, coralTypes: nextTypes };
      });
    },
    [coralTypeOptions],
  );

  const toggleDraftColour = useCallback((c: string) => {
    setDraft((d) => {
      const next = new Set(d.colours);
      if (next.has(c)) {
        next.delete(c);
      } else {
        next.add(c);
      }
      return { ...d, colours: [...next] };
    });
  }, []);

  const apply = useCallback(() => {
    if (!model) {
      return;
    }
    const href = buildExploreSearchHref({
      exchangeId: draftExchangeId || model.exchangeId,
      ownerUserId: model.ownerUserId,
      filters: draft,
    });
    navigateAfterClosingOverlay(href);
  }, [draft, draftExchangeId, model, navigateAfterClosingOverlay]);

  const clearFilters = useCallback(() => {
    if (!model) {
      return;
    }
    const cleared = emptyExploreFilters();
    setDraft(cleared);
    const href = buildExploreSearchHref({
      exchangeId: draftExchangeId || model.exchangeId,
      ownerUserId: null,
      filters: cleared,
    });
    navigateAfterClosingOverlay(href);
  }, [draftExchangeId, model, navigateAfterClosingOverlay]);

  const clearMobileSearchFields = useCallback(() => {
    setDraft((d) => ({ ...d, q: "", coralTypes: [], colours: [] }));
  }, []);

  const toggleSection = useCallback((id: MobileSection) => {
    setExpanded((prev) => (prev === id ? null : id));
  }, []);

  if (pathname !== "/explore" || !model) {
    return null;
  }

  const {
    resultCount,
    memberships,
    scopedByQuery,
    exchangeKind,
    viewerHasCoords,
    coralColours: coralColourOptions,
  } = model;
  const isGroup = exchangeKind === "GROUP";
  const countLabel = `${resultCount} Coral${resultCount === 1 ? "" : "s"} found`;

  const searchModal = (
    <div
      ref={searchModalRef}
      className="fixed inset-0 z-[60] flex flex-col bg-[#F5F5F5] pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)]"
      role="dialog"
      aria-modal="true"
      aria-label="Search corals"
    >
      <div className="flex items-center justify-between border-b border-slate-200/90 bg-[var(--color-white)] px-3 py-3 sm:px-4">
        <button
          type="button"
          className="btn btn-ghost btn-sm min-h-10 rounded-full px-2 text-[var(--color-black)]"
          onClick={dismissModalOverlay}
        >
          <ChevronLeftIcon className="h-5 w-5" />
          <span className="sr-only">Back</span>
        </button>
        <span className="text-sm font-semibold text-[var(--color-black)]">Search</span>
        <span className="w-10" aria-hidden />
      </div>

      <div className="border-b border-slate-200/80 bg-[var(--color-white)] px-3 py-2 sm:px-4">
        <p className="text-center text-sm font-semibold text-[var(--color-black)]">{countLabel}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-white)] px-3 py-4 text-[var(--color-black)] sm:px-4">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
          <AccordionRow
            label="Keyword"
            summary={labelKeyword(draft.q)}
            open={expanded === "keyword"}
            onToggle={() => toggleSection("keyword")}
          >
            <label className="form-control w-full">
              <span className="label py-1 text-xs text-slate-500">Name or description</span>
              <input
                type="search"
                value={draft.q}
                onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
                placeholder="Search listings"
                className="input input-bordered input-sm w-full rounded-xl border-slate-200 bg-white"
              />
            </label>
          </AccordionRow>

          <AccordionRow
            label="Type"
            summary={summaryTypes(draft.coralTypes, coralTypeOptions)}
            open={expanded === "type"}
            onToggle={() => toggleSection("type")}
          >
            <div className="flex max-h-56 flex-col gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
              {coralTypeOptions.map((t) => (
                <label
                  key={t}
                  className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={typeCheckboxChecked(draft.coralTypes, coralTypeOptions, t)}
                    onChange={() => toggleDraftType(t)}
                  />
                  {t}
                </label>
              ))}
            </div>
          </AccordionRow>

          <AccordionRow
            label="Colour"
            summary={summaryColours(draft.colours)}
            open={expanded === "colour"}
            onToggle={() => toggleSection("colour")}
          >
            <div className="flex max-h-56 flex-col gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
              {coralColourOptions.map((c) => (
                <ExploreColourFilterRow
                  key={c}
                  colour={c}
                  checked={draft.colours.includes(c)}
                  onToggle={() => toggleDraftColour(c)}
                  variant="inset"
                />
              ))}
            </div>
          </AccordionRow>
        </div>
      </div>

      <div className="border-t border-slate-200/90 bg-white px-3 py-3 sm:px-4">
        <div className="mx-auto flex w-full max-w-lg gap-2">
          <button type="button" className="btn btn-ghost flex-1 rounded-full" onClick={clearMobileSearchFields}>
            Clear
          </button>
          <button
            type="button"
            className="btn flex-1 rounded-full border-0 bg-emerald-500 text-white hover:bg-emerald-600"
            onClick={apply}
          >
            Show results
          </button>
        </div>
      </div>
    </div>
  );

  const filtersModal = (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 px-3 pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Filters"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close filters"
        onClick={dismissModalOverlay}
      />
      <div
        ref={filtersModalRef}
        className="relative z-[1] mb-3 w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white shadow-lg sm:mb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <button
            type="button"
            className="btn btn-ghost btn-sm min-h-9 rounded-full px-2 text-[#122B49]"
            onClick={dismissModalOverlay}
          >
            <ChevronLeftIcon className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </button>
          <span className="text-sm font-semibold text-[#122B49]">Filters</span>
          <span className="w-9" aria-hidden />
        </div>
        <div className="max-h-[min(70vh,28rem)] space-y-3 overflow-y-auto px-4 py-4">
          {!scopedByQuery ? (
            <label className="form-control w-full">
              <span className="label py-1 text-xs text-slate-500">Exchange</span>
              <select
                className="select select-bordered select-sm w-full rounded-xl"
                value={draftExchangeId}
                onChange={(e) => setDraftExchangeId(e.target.value)}
              >
                {memberships.map((m) => (
                  <option key={m.id} value={m.exchangeId}>
                    {m.name} ({m.kind === "GROUP" ? "Group" : "Event"})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={draft.freeOnly}
              onChange={(e) => setDraft((d) => ({ ...d, freeOnly: e.target.checked }))}
            />
            Free to good home only
          </label>
          {isGroup ? (
            <>
              <label className="form-control w-full">
                <span className="label py-1 text-xs text-slate-500">Handover</span>
                <select
                  className="select select-bordered select-sm w-full rounded-xl"
                  value={draft.fulfilment}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      fulfilment: e.target.value as ExploreFilterState["fulfilment"],
                    }))
                  }
                >
                  <option value="">Post or meet</option>
                  <option value="POST">Post</option>
                  <option value="MEET">Meet</option>
                </select>
              </label>
              <label className="form-control w-full">
                <span className="label py-1 text-xs text-slate-500">Max distance (km)</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={draft.maxKm}
                  onChange={(e) => setDraft((d) => ({ ...d, maxKm: e.target.value }))}
                  disabled={!viewerHasCoords}
                  className="input input-bordered input-sm w-full rounded-xl disabled:opacity-60"
                />
              </label>
              {!viewerHasCoords ? (
                <p className="text-xs text-slate-500">
                  Distance uses your saved town. Complete onboarding to enable distance.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
          <button type="button" className="btn btn-ghost btn-sm flex-1 rounded-full" onClick={clearFilters}>
            Clear
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm flex-1 rounded-full border-0 bg-emerald-500 hover:bg-emerald-600"
            onClick={apply}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div ref={rootRef} className="flex min-w-0 w-full md:flex-1 items-center justify-center gap-1.5 md:gap-2">
        {/* Mobile */}
        <div className="flex min-w-0 w-full items-center gap-1.5 md:hidden">
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm min-h-9 min-w-9 shrink-0 rounded-full text-[#122B49]"
            aria-label="Back"
            onClick={() => router.back()}
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-full border border-slate-200/90 bg-white px-3 py-2 shadow-sm"
            onClick={(e) => openMobileSearch(e.currentTarget)}
          >
            <p className="truncate text-center text-sm font-semibold text-slate-900">Search listings</p>
            <div className="flex min-w-0 flex-row items-center justify-center gap-2">
              <p className="min-w-0 flex-1 truncate text-center text-xs text-slate-600">
                {summaryTypes(draft.coralTypes, coralTypeOptions)}
              </p>
              <p className="min-w-0 flex-1 truncate text-center text-xs text-slate-600">
                {summaryColours(draft.colours)}
              </p>
            </div>
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square min-h-9 min-w-9 shrink-0 rounded-full px-0 text-[#122B49]"
            onClick={(e) => openMobileFilters(e.currentTarget)}
          >
            <FilterIcon className="h-5 w-5" aria-hidden />
            <span className="sr-only">Filters</span>
          </button>
        </div>

        {/* Desktop pill */}
        <div className="hidden min-w-0 w-full flex-1 items-center justify-center md:flex">
          <div className="flex max-w-full items-stretch rounded-full border border-slate-200/90 bg-white shadow-sm">
            <div className="relative">
              <button
                type="button"
                className="flex h-full min-w-[7rem] flex-col items-start justify-center px-4 py-2 text-left hover:bg-slate-50"
                onClick={() => setOpenMenu((m) => (m === "type" ? null : "type"))}
                aria-expanded={openMenu === "type"}
              >
                <span className="text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">Type</span>
                <span className="truncate text-sm text-slate-900">
                  {summaryTypes(draft.coralTypes, coralTypeOptions)}
                </span>
              </button>
              {openMenu === "type" ? (
                <div className="absolute left-0 top-full z-30 mt-2 max-h-72 w-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-lg">
                  {coralTypeOptions.map((t) => (
                    <label
                      key={t}
                      className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={typeCheckboxChecked(draft.coralTypes, coralTypeOptions, t)}
                        onChange={() => toggleDraftType(t)}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative border-l border-slate-200/80">
              <button
                type="button"
                className="flex h-full min-w-[7rem] flex-col items-start justify-center px-4 py-2 text-left hover:bg-slate-50"
                onClick={() => setOpenMenu((m) => (m === "colour" ? null : "colour"))}
                aria-expanded={openMenu === "colour"}
              >
                <span className="text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">Colour</span>
                <span className="truncate text-sm text-slate-900">{summaryColours(draft.colours)}</span>
              </button>
              {openMenu === "colour" ? (
                <div className="absolute left-0 top-full z-30 mt-2 max-h-72 w-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-lg">
                  {coralColourOptions.map((c) => (
                    <ExploreColourFilterRow
                      key={c}
                      colour={c}
                      checked={draft.colours.includes(c)}
                      onToggle={() => toggleDraftColour(c)}
                      variant="menu"
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative min-w-[8rem] max-w-[12rem] border-l border-slate-200/80">
              <button
                type="button"
                className="flex h-full w-full min-w-0 flex-col items-start justify-center overflow-hidden px-4 py-2 text-left hover:bg-slate-50"
                onClick={() => setOpenMenu((m) => (m === "keyword" ? null : "keyword"))}
                aria-expanded={openMenu === "keyword"}
              >
                <span className="text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">Keyword</span>
                <span className="min-w-0 w-full truncate text-sm text-slate-900">
                  {labelKeyword(draft.q)}
                </span>
              </button>
              {openMenu === "keyword" ? (
                <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
                  <label className="form-control w-full">
                    <span className="label py-1 text-xs text-slate-500">Name or description</span>
                    <input
                      type="search"
                      autoFocus
                      value={draft.q}
                      onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
                      className="input input-bordered input-sm w-full rounded-xl"
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm mt-3 w-full rounded-full border-0 bg-emerald-500 hover:bg-emerald-600"
                    onClick={() => {
                      setOpenMenu(null);
                      apply();
                    }}
                  >
                    Apply
                  </button>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-center border-l border-slate-200/80 px-1">
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-0 bg-[var(--marketing-green)] text-white transition-colors hover:brightness-[0.93] active:brightness-[0.88] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--marketing-green)]"
                aria-label="Search"
                onClick={apply}
              >
                <SearchIcon className="h-4 w-4 shrink-0" />
              </button>
            </div>
          </div>

          <div className="relative ml-2 shrink-0">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-4 py-2 text-sm font-medium text-[#122B49] shadow-sm hover:bg-slate-50"
              onClick={() => setOpenMenu((m) => (m === "filters" ? null : "filters"))}
              aria-expanded={openMenu === "filters"}
            >
              <FilterIcon className="h-4 w-4" />
              Filters
            </button>
            {openMenu === "filters" ? (
              <div className="absolute right-0 top-full z-30 mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
                <div className="flex max-h-[min(70vh,28rem)] flex-col gap-3 overflow-y-auto">
                  {!scopedByQuery ? (
                    <label className="form-control w-full">
                      <span className="label py-1 text-xs text-slate-500">Exchange</span>
                      <select
                        className="select select-bordered select-sm w-full rounded-xl"
                        value={draftExchangeId}
                        onChange={(e) => setDraftExchangeId(e.target.value)}
                      >
                        {memberships.map((m) => (
                          <option key={m.id} value={m.exchangeId}>
                            {m.name} ({m.kind === "GROUP" ? "Group" : "Event"})
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={draft.freeOnly}
                      onChange={(e) => setDraft((d) => ({ ...d, freeOnly: e.target.checked }))}
                    />
                    Free to good home only
                  </label>
                  {isGroup ? (
                    <>
                      <label className="form-control w-full">
                        <span className="label py-1 text-xs text-slate-500">Handover</span>
                        <select
                          className="select select-bordered select-sm w-full rounded-xl"
                          value={draft.fulfilment}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              fulfilment: e.target.value as ExploreFilterState["fulfilment"],
                            }))
                          }
                        >
                          <option value="">Post or meet</option>
                          <option value="POST">Post</option>
                          <option value="MEET">Meet</option>
                        </select>
                      </label>
                      <label className="form-control w-full">
                        <span className="label py-1 text-xs text-slate-500">Max distance (km)</span>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={draft.maxKm}
                          onChange={(e) => setDraft((d) => ({ ...d, maxKm: e.target.value }))}
                          disabled={!viewerHasCoords}
                          className="input input-bordered input-sm w-full rounded-xl disabled:opacity-60"
                        />
                      </label>
                    </>
                  ) : null}
                </div>
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                  <button type="button" className="btn btn-ghost btn-sm flex-1 rounded-full" onClick={clearFilters}>
                    Clear
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm flex-1 rounded-full border-0 bg-emerald-500 hover:bg-emerald-600"
                    onClick={() => {
                      setOpenMenu(null);
                      apply();
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {mobileSearchOpen ? createPortal(searchModal, document.body) : null}
      {mobileFiltersOpen ? createPortal(filtersModal, document.body) : null}
    </>
  );
}

function AccordionRow({
  label,
  summary,
  open,
  onToggle,
  children,
}: {
  label: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="shrink-0 text-sm font-medium text-[#122B49]">{label}</span>
        <span className="min-w-0 flex-1 truncate text-right text-sm text-slate-600">{summary}</span>
        <ChevronDownIcon
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? <div className="border-t border-slate-100 px-4 py-3">{children}</div> : null}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
