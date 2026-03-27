import Image from "next/image";
import Link from "next/link";
import { MARKETING_CTA_GREEN, MARKETING_MUTED_BOX, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; debugToken?: string }>;
}) {
  const params = await searchParams;
  const debugHref = params.debugToken ? `/auth/verify?token=${encodeURIComponent(params.debugToken)}` : null;

  return (
    <main className="min-h-dvh bg-white text-slate-600">
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-2 lg:items-center lg:gap-10">
        <section className="order-1 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-7">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: MARKETING_NAVY }}>
            Check your email
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            We sent a sign-in link to <span className="font-medium text-slate-700">{params.email ?? "your email"}</span>.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            With <code className="rounded bg-slate-100 px-1">MAILTRAP_API_KEY</code> and{" "}
            <code className="rounded bg-slate-100 px-1">EMAIL_FROM</code> set, we email this link automatically. In local
            development, use the debug link below when those are unset (or when sandbox mode is misconfigured).
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

        <section className="order-2 lg:justify-self-end">
          <div
            className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl p-6 sm:max-w-lg lg:max-w-xl"
            style={{ backgroundColor: MARKETING_MUTED_BOX }}
          >
            <Image
              src="/marketing/hero-corals.png"
              alt=""
              width={640}
              height={520}
              className="h-auto w-full object-contain"
              priority
            />
          </div>
        </section>
      </section>
    </main>
  );
}
