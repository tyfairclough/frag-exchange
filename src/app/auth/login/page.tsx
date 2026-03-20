import { requestMagicLinkAction } from "@/app/auth/actions";

const providers = [
  { id: "magic-link", label: "Email magic link", enabled: true },
  { id: "google", label: "Google SSO (next provider)", enabled: false },
] as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-5 px-4 py-8">
      <section className="card border border-base-content/10 bg-base-100 shadow-sm">
        <div className="card-body gap-4 p-5">
          <p className="text-sm font-medium text-primary">Chunk 2 — Identity</p>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to Frag Exchange</h1>
          <p className="text-sm text-base-content/70">
            Start with magic link sign-in now. SSO is abstracted as the next provider to plug in.
          </p>

          {params.error ? (
            <div role="alert" className="alert alert-error text-sm">
              Enter a valid email address.
            </div>
          ) : null}

          <form action={requestMagicLinkAction} className="space-y-3">
            <label className="form-control w-full gap-1">
              <span className="label-text text-sm font-medium">Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="input input-bordered w-full"
              />
            </label>
            <button className="btn btn-primary w-full" type="submit">
              Continue with magic link
            </button>
          </form>

          <div className="divider my-1 text-xs">Auth providers</div>
          <ul className="space-y-2">
            {providers.map((provider) => (
              <li key={provider.id}>
                <button className="btn btn-outline w-full justify-between" disabled={!provider.enabled} type="button">
                  <span>{provider.label}</span>
                  <span className="text-xs opacity-70">{provider.enabled ? "Active" : "Planned"}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
