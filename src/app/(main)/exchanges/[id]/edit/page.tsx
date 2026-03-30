import Link from "next/link";
import { notFound } from "next/navigation";
import { ExchangeKind, ExchangeVisibility } from "@/generated/prisma/enums";
import { updateExchangeAction } from "@/app/(main)/exchanges/actions";
import { ExchangeLogoField } from "@/app/(main)/exchanges/components/exchange-logo-field";
import { MARKETING_CTA_GREEN, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";
import { getPrisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/require-super-admin";

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const editErrors: Record<string, string> = {
  name: "Enter a name for the exchange.",
  logo: "Upload a valid logo image (JPG, PNG, or WebP up to 6MB).",
  "not-found": "That exchange could not be updated.",
};

export default async function EditExchangePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const errorMessage = sp.error ? editErrors[sp.error] ?? "Something went wrong." : null;

  const exchange = await getPrisma().exchange.findUnique({ where: { id } });
  if (!exchange) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center gap-3">
        <Link
          href={`/exchanges/${exchange.id}`}
          className="inline-flex min-h-10 items-center rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
        >
          Back
        </Link>
      </div>

      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Operators</p>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
          Edit exchange
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Changing type to group demotes all event managers to members on this hub.
        </p>
      </div>

      {errorMessage ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {errorMessage}
        </div>
      ) : null}

      <form
        action={updateExchangeAction}
        encType="multipart/form-data"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <input type="hidden" name="exchangeId" value={exchange.id} />
        <div className="space-y-4">
          <label className="block w-full">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Name</span>
            <input
              name="name"
              type="text"
              required
              maxLength={160}
              defaultValue={exchange.name}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="e.g. Reef Expo 2026"
            />
          </label>

          <label className="block w-full">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Description (optional)</span>
            <textarea
              name="description"
              rows={3}
              defaultValue={exchange.description ?? ""}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="Short blurb for members"
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-700">Type</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <input
                type="radio"
                name="kind"
                value="EVENT"
                className="mt-0.5"
                defaultChecked={exchange.kind === ExchangeKind.EVENT}
              />
              <span className="text-sm text-slate-700">Event (swap day, event managers, check-in later)</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <input
                type="radio"
                name="kind"
                value="GROUP"
                className="mt-0.5"
                defaultChecked={exchange.kind === ExchangeKind.GROUP}
              />
              <span className="text-sm text-slate-700">Group (ongoing club or region)</span>
            </label>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-700">Visibility</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <input
                type="radio"
                name="visibility"
                value="PUBLIC"
                className="mt-0.5"
                defaultChecked={exchange.visibility === ExchangeVisibility.PUBLIC}
              />
              <span className="text-sm text-slate-700">Public — anyone can discover and join</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <input
                type="radio"
                name="visibility"
                value="PRIVATE"
                className="mt-0.5"
                defaultChecked={exchange.visibility === ExchangeVisibility.PRIVATE}
              />
              <span className="text-sm text-slate-700">Private — invite only</span>
            </label>
          </fieldset>

          <label className="block w-full">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Event date (optional)</span>
            <input
              name="eventDate"
              type="datetime-local"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              defaultValue={exchange.eventDate ? toDatetimeLocalValue(exchange.eventDate) : ""}
            />
            <span className="mt-1 block text-xs text-slate-500">Used later for trade expiry on event exchanges.</span>
          </label>

          <ExchangeLogoField initialImageUrl={exchange.logo512Url ?? exchange.logo80Url ?? exchange.logo40Url} />

          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-white transition hover:opacity-95 active:scale-[0.99]"
            style={{ backgroundColor: MARKETING_CTA_GREEN }}
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
