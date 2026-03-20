import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
      <section className="card border border-base-content/10 bg-base-200/45 shadow-sm">
        <div className="card-body p-5">
        <p className="text-sm font-medium text-primary">Chunk 1 — Foundation</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-base-content">
          Welcome to Frag Exchange
        </h1>
        <p className="mt-3 text-base leading-relaxed text-base-content/70">
          You are signed in with Chunk 2 identity flow: magic link auth, onboarding, consent capture, alias, and
          address rules.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/explore"
            className="btn btn-primary min-h-11 rounded-xl px-4 text-sm"
          >
            Explore (placeholder)
          </Link>
          <Link
            href="/api/health"
            className="btn btn-outline min-h-11 rounded-xl px-4 text-sm"
          >
            API health JSON
          </Link>
        </div>
        </div>
      </section>
    </div>
  );
}
