"use client";

import { useEffect } from "react";
import { isDatabaseUnavailableError } from "@/lib/db-warm-errors";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const dbDown = isDatabaseUnavailableError(error);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <h1 className="text-xl font-semibold text-base-content">
        {dbDown ? "Database unavailable" : "Something went wrong"}
      </h1>
      <p className="max-w-sm text-sm leading-relaxed text-base-content/70">
        {dbDown ? (
          <>
            {error.message ||
              "The database did not respond in time. It may still be starting after idle, or there may be a service issue."}
            <span className="mt-2 block text-base-content/60">You can try again in a few seconds.</span>
          </>
        ) : (
          <>
            {error.message || "An unexpected error occurred. You can try again."}
            <span className="mt-2 block text-base-content/60">
              On a slow or offline connection, check your network and try again.
            </span>
          </>
        )}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="btn btn-primary min-h-11 min-w-[8rem] rounded-xl px-4 text-sm"
      >
        Try again
      </button>
    </div>
  );
}
