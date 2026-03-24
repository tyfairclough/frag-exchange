import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/auth/login" className="text-sm font-semibold text-blue-700 hover:underline">
        ← Back to sign in
      </Link>
      <article className="rounded-2xl border border-slate-200/80 bg-white p-5 text-slate-600 shadow-sm sm:p-7">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Privacy notice (placeholder)</h1>
        <p className="mt-3">
          GDPR-oriented summary for development: we process account email, onboarding choices, and optional postal
          details to run exchanges. Full name and exact home location are not used in discovery (Chunk 5); town-level
          data may be used for distance browse. Consent timestamps for Terms and this notice are stored on your user
          record.
        </p>
        <p className="mt-3">
          Replace this page with a full privacy policy and data-processing register before production.
        </p>
      </article>
    </main>
  );
}
