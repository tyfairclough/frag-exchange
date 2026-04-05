import Link from "next/link";
import {
  createAliasWordAction,
  deleteAliasWordAction,
  updateAliasWordAction,
} from "@/app/(main)/me/admin/alias-words/actions";
import { MARKETING_CTA_GREEN, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";
import { getPrisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { MIN_ALIAS_GENERATOR_WORDS } from "@/lib/suggested-alias";

export default async function AliasWordsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const words = await getPrisma().aliasGeneratorWord.findMany({
    orderBy: { word: "asc" },
  });

  let errorMessage: string | null = null;
  if (params.error === "duplicate") {
    errorMessage = "That word already exists.";
  } else if (params.error === "missing") {
    errorMessage = "Something went wrong. Try again.";
  } else if (params.error) {
    errorMessage = decodeURIComponent(params.error);
  }

  const lowStock = words.length < MIN_ALIAS_GENERATOR_WORDS;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center gap-3">
        <Link
          href="/me"
          className="inline-flex min-h-10 items-center rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
        >
          Back
        </Link>
      </div>

      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Operators</p>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
          Alias generator words
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Default onboarding aliases use three random words from this list plus four digits. Keep at least three words
          so new members can finish signup without typing a name.
        </p>
      </div>

      {lowStock ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Only {words.length} word{words.length === 1 ? "" : "s"} in the list. Add more so there are at least{" "}
          {MIN_ALIAS_GENERATOR_WORDS} for automatic suggestions.
        </div>
      ) : null}

      {errorMessage ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-800">Add word</h2>
        <form action={createAliasWordAction} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Word</span>
            <input
              name="word"
              type="text"
              required
              maxLength={64}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="e.g. tang"
            />
          </label>
          <button
            type="submit"
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-white sm:shrink-0"
            style={{ backgroundColor: MARKETING_CTA_GREEN }}
          >
            Add
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-800">Words ({words.length})</h2>
        <ul className="mt-4 divide-y divide-slate-100">
          {words.map((row) => (
            <li key={row.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
              <form action={updateAliasWordAction} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <input type="hidden" name="id" value={row.id} />
                <input
                  name="word"
                  type="text"
                  required
                  maxLength={64}
                  defaultValue={row.word}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 sm:max-w-xs"
                />
                <button type="submit" className="btn btn-outline btn-sm rounded-xl sm:ml-2">
                  Save
                </button>
              </form>
              <form action={deleteAliasWordAction} className="shrink-0">
                <input type="hidden" name="id" value={row.id} />
                <button type="submit" className="btn btn-ghost btn-sm text-red-700 hover:bg-red-50">
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
        {words.length === 0 ? <p className="mt-2 text-sm text-slate-500">No words yet. Add some above.</p> : null}
      </section>
    </div>
  );
}
