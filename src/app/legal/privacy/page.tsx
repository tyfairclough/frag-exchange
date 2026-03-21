import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 px-4 py-8">
      <Link href="/auth/login" className="link link-primary text-sm">
        ← Back to sign in
      </Link>
      <article className="prose prose-sm max-w-none text-base-content">
        <h1 className="text-xl font-semibold">Privacy notice (placeholder)</h1>
        <p className="text-base-content/80">
          GDPR-oriented summary for development: we process account email, onboarding choices, and optional postal
          details to run exchanges. Full name and exact home location are not used in discovery (Chunk 5); town-level
          data may be used for distance browse. Consent timestamps for Terms and this notice are stored on your user
          record.
        </p>
        <p className="text-base-content/80">
          Replace this page with a full privacy policy and data-processing register before production.
        </p>
      </article>
    </main>
  );
}
