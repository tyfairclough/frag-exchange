import Link from "next/link";
import { MARKETING_CTA_GREEN, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";
import { isDevMagicLinkViaEmail } from "@/lib/dev-magic-link-mode";
import { ensureDatabaseReady } from "@/lib/db-warm";

export const dynamic = "force-dynamic";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; debugToken?: string }>;
}) {
  const params = await searchParams;
  await ensureDatabaseReady();
  const debugHref =
    process.env.NODE_ENV === "development" && !isDevMagicLinkViaEmail() && params.debugToken
      ? `/auth/verify?token=${encodeURIComponent(params.debugToken)}`
      : null;

  return (
    <main
      className="flex min-h-dvh flex-col bg-white bg-right-bottom bg-no-repeat text-slate-600"
      style={{
        backgroundImage: "url('/marketing/coral_illustration_001.svg')",
        backgroundSize: "auto 50vh",
      }}
    >
      <section className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-2 lg:items-center lg:gap-10">
        <section className="order-1 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-7">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: MARKETING_NAVY }}>
            Check your email
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            A REEFxCHANGE access link was sent to{" "}
            <span className="font-medium text-slate-700">{params.email ?? "your email"}</span>.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            This link allows you to securely access your account via your email inbox. You can set a password at anytime
            to skip this step.
          </p>

          <div className="mt-5 space-y-3">
            {debugHref ? (
              <Link
                href={debugHref}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full px-6 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99]"
                style={{ backgroundColor: MARKETING_CTA_GREEN }}
              >
                Open debug magic link
              </Link>
            ) : null}
            <Link
              href="/auth/login"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Back to sign in
            </Link>
          </div>
        </section>

        <div className="order-2 hidden min-h-px lg:block" aria-hidden />
      </section>
    </main>
  );
}
