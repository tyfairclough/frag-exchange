import { requestMagicLinkAction } from "@/app/auth/actions";
import { AUTH_PROVIDERS } from "@/lib/auth/providers";

const loginErrors: Record<string, string> = {
  "invalid-email": "Enter a valid email address.",
  "invalid-token": "That sign-in link is invalid or has expired. Request a new one.",
  "sso-not-ready": "That sign-in method is not available yet.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.error ? loginErrors[params.error] ?? "Something went wrong. Try again." : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-5 px-4 py-8">
      <section className="card border border-base-content/10 bg-base-100 shadow-sm">
        <div className="card-body gap-4 p-5">
          <p className="text-sm font-medium text-primary">Chunk 2 — Identity</p>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to Frag Exchange</h1>
          <p className="text-sm text-base-content/70">
            Magic link is active today. Additional providers are listed for a single SSO integration point later.
          </p>

          {errorMessage ? (
            <div role="alert" className="alert alert-error text-sm">
              {errorMessage}
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

          <div className="divider my-1 text-xs">More sign-in options (planned)</div>
          <ul className="space-y-2">
            {AUTH_PROVIDERS.filter((p) => !p.enabled).map((provider) => (
              <li key={provider.id}>
                <button
                  className="btn btn-outline w-full justify-between"
                  disabled
                  type="button"
                  title={provider.description}
                >
                  <span>{provider.label}</span>
                  <span className="text-xs opacity-70">Planned</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
