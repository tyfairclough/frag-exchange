"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";

const SALE_DISCLAIMER_SESSION_KEY = "reefx.saleDisclaimerAccepted";

function parseExternalUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export default function SaleDisclaimerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const posthog = usePostHog();
  const listingId = searchParams.get("listingId");
  const exchangeId = searchParams.get("exchangeId");
  const itemId = searchParams.get("itemId");
  const targetUrl = useMemo(() => parseExternalUrl(searchParams.get("url")), [searchParams]);

  useEffect(() => {
    if (!targetUrl) return;
    if (sessionStorage.getItem(SALE_DISCLAIMER_SESSION_KEY) !== "1") return;
    posthog?.capture("sale_outbound_click", { listingId, exchangeId, itemId, targetUrl, via: "session_bypass" });
    window.location.replace(targetUrl);
  }, [exchangeId, itemId, listingId, posthog, targetUrl]);

  if (!targetUrl) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 px-4 py-8">
        <h1 className="text-xl font-semibold">Invalid sale link</h1>
        <p className="text-sm text-base-content/70">The external listing URL is missing or invalid.</p>
        <button type="button" className="btn btn-primary w-fit" onClick={() => router.back()}>
          Go back
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Before you continue</h1>
      <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
        REEFxCHANGE is not involved in payment, delivery, shipping, or disputes for sale listings. Any sale is directly between
        buyer and seller outside REEFxCHANGE.
      </div>
      <p className="text-sm text-base-content/70">You are about to open an external website.</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            sessionStorage.setItem(SALE_DISCLAIMER_SESSION_KEY, "1");
            posthog?.capture("sale_disclaimer_accepted", { listingId, exchangeId, itemId, targetUrl });
            posthog?.capture("sale_outbound_click", { listingId, exchangeId, itemId, targetUrl, via: "disclaimer_accept" });
            window.location.assign(targetUrl);
          }}
        >
          Continue to listing
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </main>
  );
}
