import { requestMagicLinkAction, signInWithPasswordAction } from "@/app/auth/actions";
import { MARKETING_CTA_GREEN, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";
import { AUTH_PROVIDERS } from "@/lib/auth/providers";

const loginErrors: Record<string, string> = {
  "invalid-email": "Enter a valid email address.",
  "invalid-token": "That sign-in link is invalid or has expired. Request a new one.",
  "sso-not-ready": "That sign-in method is not available yet.",
  "invalid-credentials": "Email or password is incorrect.",
  "rate-limit": "Too many attempts from this network. Please wait a little while and try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.error ? loginErrors[params.error] ?? "Something went wrong. Try again." : null;

  return (
    <main className="min-h-dvh bg-white text-slate-600">
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-2 lg:items-center lg:gap-10">
        <section className="order-1 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-7">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: MARKETING_NAVY }}>
            Sign in to REEFX
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Magic link is active today. Additional providers are listed for a single SSO integration point later.
          </p>

          {errorMessage ? (
            <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <form action={requestMagicLinkAction} className="mt-5 space-y-3">
            <label className="block w-full">
              <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </label>
            <button
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full px-6 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99]"
              style={{ backgroundColor: MARKETING_CTA_GREEN }}
              type="submit"
            >
              Continue with magic link
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-slate-200" />
            <span>Or sign in with password</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form action={signInWithPasswordAction} className="space-y-3">
            <label className="block w-full">
              <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </label>
            <label className="block w-full">
              <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </label>
            <button
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              type="submit"
            >
              Sign in with password
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-slate-200" />
            <span>More sign-in options (planned)</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <ul className="space-y-2">
            {AUTH_PROVIDERS.filter((p) => !p.enabled).map((provider) => (
              <li key={provider.id}>
                <button
                  className="inline-flex min-h-11 w-full items-center justify-between rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 opacity-80"
                  disabled
                  type="button"
                  title={provider.description}
                >
                  <span>{provider.label}</span>
                  <span className="text-xs">Planned</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="order-2 lg:justify-self-end">
          <div className="relative mx-auto w-full max-w-md sm:max-w-lg lg:max-w-xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- static marketing SVG from /public */}
            <img
              src="/marketing/coral_illustration_001.svg"
              alt=""
              width={640}
              height={335}
              className="h-auto w-full object-contain"
              decoding="async"
              fetchPriority="high"
            />
          </div>
        </section>
      </section>
    </main>
  );
}
