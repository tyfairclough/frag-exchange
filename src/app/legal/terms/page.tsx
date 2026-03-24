import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/auth/login" className="text-sm font-semibold text-blue-700 hover:underline">
        ← Back to sign in
      </Link>
      <article className="rounded-2xl border border-slate-200/80 bg-white p-5 text-slate-600 shadow-sm sm:p-7">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Terms of Service (placeholder)</h1>
        <p className="mt-3">
          This is a short placeholder for Chunk 2 onboarding. Replace with counsel-approved terms before launch. By
          accepting during onboarding you agree to the version shown on the form (timestamp stored on your account).
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Use the service lawfully and respect other hobbyists.</li>
          <li>Listings and trades are between users; Frag Exchange facilitates discovery only.</li>
        </ul>
      </article>
    </main>
  );
}
