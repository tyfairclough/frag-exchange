"use client";

import { useEffect } from "react";
import { useExploreShell, type ExploreShellModel } from "@/components/explore-shell-context";

export function ExploreShellSync({ model }: { model: ExploreShellModel }) {
  const { setModel } = useExploreShell();

  useEffect(() => {
    setModel(model);
  }, [model, setModel]);

  useEffect(() => {
    return () => setModel(null);
  }, [setModel]);

  return null;
}
