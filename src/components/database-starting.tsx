/** Shared copy/skeleton for RSC loading fallbacks while Postgres (e.g. Neon) may be resuming. */
export function DatabaseStartingFallback() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6" aria-busy="true" aria-live="polite">
      <p className="text-sm text-slate-500">Connecting to the database… This can take a few seconds after idle.</p>
      <div className="skeleton h-8 w-40 rounded-lg" />
      <div className="card border border-base-content/10 bg-base-200/45">
        <div className="card-body space-y-3 p-5">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-6 w-3/4 max-w-sm rounded" />
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-5/6 rounded" />
        </div>
      </div>
    </div>
  );
}
