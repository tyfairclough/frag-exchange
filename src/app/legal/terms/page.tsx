import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 px-4 py-8">
      <Link href="/auth/login" className="link link-primary text-sm">
        ← Back to sign in
      </Link>
      <article className="prose prose-sm max-w-none text-base-content">
        <h1 className="text-xl font-semibold">Terms of Service (placeholder)</h1>
        <p className="text-base-content/80">
          This is a short placeholder for Chunk 2 onboarding. Replace with counsel-approved terms before launch. By
          accepting during onboarding you agree to the version shown on the form (timestamp stored on your account).
        </p>
        <ul className="text-base-content/80">
          <li>Use the service lawfully and respect other hobbyists.</li>
          <li>Listings and trades are between users; Frag Exchange facilitates discovery only.</li>
        </ul>
      </article>
    </main>
  );
}
