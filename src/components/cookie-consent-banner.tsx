"use client";

import posthog from "posthog-js";
import { usePostHog } from "posthog-js/react";
import Link from "next/link";
import { useEffect, useState } from "react";

type ConsentUiState = "unknown" | "visible" | "hidden";

/**
 * GDPR-style analytics consent: show until the user explicitly accepts or declines.
 * Relies on PostHog strict opt-in init + opt_in/opt_out APIs.
 */
export function CookieConsentBanner() {
  const client = usePostHog();
  const [ui, setUi] = useState<ConsentUiState>("unknown");

  useEffect(() => {
    if (!client) return;
    // Defer one tick so parent `PostHogProvider` init effect runs first (mount ordering).
    const id = window.setTimeout(() => {
      const status = posthog.get_explicit_consent_status();
      setUi(status === "pending" ? "visible" : "hidden");
    }, 0);
    return () => window.clearTimeout(id);
  }, [client]);

  const handleAccept = () => {
    posthog.opt_in_capturing({
      captureEventName: false,
    });
    setUi("hidden");
  };

  const handleDecline = () => {
    posthog.opt_out_capturing();
    setUi("hidden");
  };

  if (ui !== "visible") return null; // unknown: wait for consent read; hidden: user already chose

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[1700] border-t border-slate-200/90 bg-white/95 p-4 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur-md supports-[backdrop-filter]:bg-white/90 sm:p-5"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1 text-sm text-slate-600">
          <h2 id="cookie-consent-title" className="text-base font-semibold text-slate-900">
            Analytics cookies
          </h2>
          <p id="cookie-consent-desc" className="leading-relaxed">
            We use PostHog to understand aggregate usage and improve REEFX. Analytics cookies are only used if you
            accept. See our{" "}
            <Link href="/legal/privacy" className="font-medium text-teal-700 underline-offset-2 hover:underline">
              privacy notice
            </Link>{" "}
            for details.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            className="btn btn-ghost btn-sm rounded-xl border border-slate-200 text-slate-700 hover:border-slate-300"
            onClick={handleDecline}
          >
            Decline
          </button>
          <button type="button" className="btn btn-primary btn-sm rounded-xl" onClick={handleAccept}>
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  );
}
