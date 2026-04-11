"use client";

import { useRouter } from "nextjs-toploader/app";

export function ExchangesWelcomeBannerDismiss() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.replace("/exchanges")}
      className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-900/80 underline-offset-2 hover:underline"
    >
      Dismiss
    </button>
  );
}
