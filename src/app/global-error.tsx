"use client";

import { isDatabaseUnavailableError } from "@/lib/db-warm-errors";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dbDown = isDatabaseUnavailableError(error);

  return (
    <html lang="en">
      <body data-theme="fragdark" className="min-h-dvh bg-base-100 text-base-content antialiased">
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <h1 className="text-xl font-semibold">
            {dbDown ? "REEFX — database unavailable" : "REEFX — critical error"}
          </h1>
          <p className="max-w-sm text-sm text-base-content/70">
            {dbDown
              ? error.message ||
                "The database did not respond in time. Wait a moment and try again, or reload the page."
              : error.message || "Please reload the page."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="btn btn-primary min-h-11 min-w-[8rem] rounded-xl px-4 text-sm"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
