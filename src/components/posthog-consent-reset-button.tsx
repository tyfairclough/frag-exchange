"use client";

import posthog from "posthog-js";
import { useCallback } from "react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

/**
 * Clears PostHog opt-in/opt-out state so the cookie banner can appear again on reload.
 * Only rendered when PostHog is configured.
 */
export function PosthogConsentResetButton() {
  const handleReset = useCallback(() => {
    posthog.clear_opt_in_out_capturing();
    window.location.reload();
  }, []);

  if (!POSTHOG_KEY) return null;

  return (
    <button type="button" className="btn btn-outline btn-sm" onClick={handleReset}>
      Reset cookie preferences
    </button>
  );
}
