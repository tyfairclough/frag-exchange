"use client";

import { useEffect } from "react";

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

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <h1 className="text-xl font-semibold text-base-content">Something went wrong</h1>
      <p className="max-w-sm text-sm leading-relaxed text-base-content/70">
        {error.message || "An unexpected error occurred. You can try again."}
        <span className="mt-2 block text-base-content/60">
          On a slow or offline connection, check your network and try again.
        </span>
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
