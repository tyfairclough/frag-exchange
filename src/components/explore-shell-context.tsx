"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ExploreFilterState } from "@/lib/explore-search-href";

export type ExploreShellMembership = {
  id: string;
  exchangeId: string;
  name: string;
  kind: "GROUP" | "EVENT";
};

export type ExploreShellModel = {
  resultCount: number;
  memberships: ExploreShellMembership[];
  exchangeId: string;
  scopedByQuery: boolean;
  exchangeKind: "GROUP" | "EVENT";
  viewerHasCoords: boolean;
  coralTypes: readonly string[];
  coralColours: readonly string[];
  filters: ExploreFilterState;
  ownerUserId: string | null;
};

type ExploreShellContextValue = {
  model: ExploreShellModel | null;
  setModel: (next: ExploreShellModel | null) => void;
};

const ExploreShellContext = createContext<ExploreShellContextValue | null>(null);

export function ExploreShellProvider({ children }: { children: ReactNode }) {
  const [model, setModelState] = useState<ExploreShellModel | null>(null);
  const setModel = useCallback((next: ExploreShellModel | null) => {
    setModelState(next);
  }, []);

  const value = useMemo(() => ({ model, setModel }), [model, setModel]);

  return <ExploreShellContext.Provider value={value}>{children}</ExploreShellContext.Provider>;
}

export function useExploreShell(): ExploreShellContextValue {
  const ctx = useContext(ExploreShellContext);
  if (!ctx) {
    throw new Error("useExploreShell must be used within ExploreShellProvider");
  }
  return ctx;
}
