"use client";

import { createContext, useContext } from "react";

const DatabaseBootReadyContext = createContext<boolean | null>(null);

/** When no provider (e.g. tests), treat as ready so Link behaves normally. */
export function useDatabaseBootReady(): boolean {
  const v = useContext(DatabaseBootReadyContext);
  if (v === null) {
    return true;
  }
  return v;
}

export function DatabaseBootReadyProvider({
  ready,
  children,
}: {
  ready: boolean;
  children: React.ReactNode;
}) {
  return <DatabaseBootReadyContext.Provider value={ready}>{children}</DatabaseBootReadyContext.Provider>;
}
