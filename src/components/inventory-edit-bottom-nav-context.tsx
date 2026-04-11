"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type InventoryEditBottomNavContextValue = {
  replaceBottomNavWithImagePicker: boolean;
  setReplaceBottomNavWithImagePicker: (v: boolean) => void;
};

const InventoryEditBottomNavContext = createContext<InventoryEditBottomNavContextValue | null>(null);

export function InventoryEditBottomNavProvider({ children }: { children: ReactNode }) {
  const [replaceBottomNavWithImagePicker, setReplaceBottomNavWithImagePicker] = useState(false);
  const value = useMemo(
    () => ({ replaceBottomNavWithImagePicker, setReplaceBottomNavWithImagePicker }),
    [replaceBottomNavWithImagePicker],
  );
  return (
    <InventoryEditBottomNavContext.Provider value={value}>{children}</InventoryEditBottomNavContext.Provider>
  );
}

export function useInventoryEditBottomNav() {
  const ctx = useContext(InventoryEditBottomNavContext);
  if (!ctx) {
    throw new Error("useInventoryEditBottomNav must be used within InventoryEditBottomNavProvider");
  }
  return ctx;
}

/** Call from the my-items edit page when the editable form is mounted so the shell can swap the bottom bar. */
export function InventoryEditBottomNavBridge() {
  const { setReplaceBottomNavWithImagePicker } = useInventoryEditBottomNav();
  useEffect(() => {
    setReplaceBottomNavWithImagePicker(true);
    return () => setReplaceBottomNavWithImagePicker(false);
  }, [setReplaceBottomNavWithImagePicker]);
  return null;
}
