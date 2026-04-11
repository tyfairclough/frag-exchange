import Link from "next/link";
import { createExchangeAction } from "@/app/(main)/exchanges/actions";
import { ExchangeLogoField } from "@/app/(main)/exchanges/components/exchange-logo-field";
import { NewExchangeEventDatePicker } from "@/app/(main)/exchanges/components/new-exchange-event-date-picker";
import { MARKETING_CTA_GREEN, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";
import { requireSuperAdmin } from "@/lib/require-super-admin";

export default async function NewExchangePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const nameError = params.error === "name";
  const logoError = params.error === "logo";
  const eventDateError = params.error === "event-date";
  const itemTypesError = params.error === "item-types";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center gap-3">
        <Link
          href="/exchanges"
          className="inline-flex min-h-10 items-center rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
        >
          Back
        </Link>
      </div>

      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Operators</p>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
          Create exchange
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Event vs group, public vs private. You are added as a member; use the exchange page to invite others to
          private hubs or promote event managers on event exchanges.
        </p>
      </div>

      {nameError ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Enter a name for the exchange.
        </div>
      ) : null}
      {logoError ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Upload a valid logo image (JPG, PNG, or WebP up to 6MB).
        </div>
      ) : null}
      {eventDateError ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Select an event date when creating an event exchange.
        </div>
      ) : null}
      {itemTypesError ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Select at least one item type.
        </div>
      ) : null}

      <form
        action={createExchangeAction}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="space-y-4">
          <label className="block w-full">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Name</span>
            <input
              name="name"
              type="text"
              required
              maxLength={160}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="e.g. Reef Expo 2026"
            />
          </label>

          <label className="block w-full">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Description (optional)</span>
            <textarea
              name="description"
              rows={3}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="Short blurb for members"
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-700">Visibility</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <input type="radio" name="visibility" value="PUBLIC" className="mt-0.5" defaultChecked />
              <span className="text-sm text-slate-700">Public — anyone can discover and join</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <input type="radio" name="visibility" value="PRIVATE" className="mt-0.5" />
              <span className="text-sm text-slate-700">Private — invite only</span>
            </label>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-700">Allowed item types</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <input type="checkbox" name="allowCoral" className="mt-0.5" defaultChecked />
              <span className="text-sm text-slate-700">Coral</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <input type="checkbox" name="allowFish" className="mt-0.5" defaultChecked />
              <span className="text-sm text-slate-700">Fish</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <input type="checkbox" name="allowEquipment" className="mt-0.5" defaultChecked />
              <span className="text-sm text-slate-700">Gear</span>
            </label>
          </fieldset>

          <NewExchangeEventDatePicker />

          <ExchangeLogoField />

          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-white transition hover:opacity-95 active:scale-[0.99]"
            style={{ backgroundColor: MARKETING_CTA_GREEN }}
          >
            Create exchange
          </button>
        </div>
      </form>
    </div>
  );
}
