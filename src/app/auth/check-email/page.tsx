import Link from "next/link";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; debugToken?: string }>;
}) {
  const params = await searchParams;
  const debugHref = params.debugToken ? `/auth/verify?token=${encodeURIComponent(params.debugToken)}` : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-5 px-4 py-8">
      <section className="card border border-base-content/10 bg-base-100 shadow-sm">
        <div className="card-body gap-4 p-5">
          <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
          <p className="text-sm text-base-content/75">
            We sent a sign-in link to <span className="font-medium">{params.email ?? "your email"}</span>.
          </p>
          <p className="text-xs text-base-content/60">
            With <code className="rounded bg-base-200 px-1">MAILTRAP_API_KEY</code> and{" "}
            <code className="rounded bg-base-200 px-1">EMAIL_FROM</code> set, we email this link automatically. In local
            development, use the debug link below when those are unset (or when sandbox mode is misconfigured).
          </p>

          {debugHref ? (
            <Link href={debugHref} className="btn btn-primary">
              Open debug magic link
            </Link>
          ) : null}
          <Link href="/auth/login" className="btn btn-ghost">
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
