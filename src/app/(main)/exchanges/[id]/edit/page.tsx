import { notFound, redirect } from "next/navigation";
import { ExchangeKind, ExchangeVisibility } from "@/generated/prisma/enums";
import { updateExchangeAction } from "@/app/(main)/exchanges/actions";
import { ExchangeLogoField } from "@/app/(main)/exchanges/components/exchange-logo-field";
import { MARKETING_CTA_GREEN, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  canAccessOperatorDashboard,
  canIssuePrivateInvite,
  canManageEventDesk,
  canViewExchangeDirectory,
  isSuperAdmin,
} from "@/lib/super-admin";
import { OperatorExchangeTabs } from "@/app/(main)/operator/components/operator-exchange-tabs";

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const editErrors: Record<string, string> = {
  name: "Enter a name for the exchange.",
  logo: "Upload a valid logo image (JPG, PNG, or WebP up to 6MB).",
  "item-types": "Select at least one item type.",
  "join-tiers": "Select at least one member tier that can join.",
  "not-found": "That exchange could not be updated.",
};

export default async function EditExchangePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const errorMessage = sp.error ? editErrors[sp.error] ?? "Something went wrong." : null;

  const exchange = await getPrisma().exchange.findUnique({
    where: { id },
    include: {
      memberships: { where: { userId: user.id }, take: 1 },
    },
  });

  if (!exchange) {
    notFound();
  }

  const membership = exchange.memberships[0] ?? null;
  if (!canViewExchangeDirectory(exchange, membership, user) || !canAccessOperatorDashboard(user, membership)) {
    redirect("/exchanges?error=forbidden");
  }

  const superUser = isSuperAdmin(user);
  const eventDesk = canManageEventDesk(exchange, membership, user);
  const privateInvites = canIssuePrivateInvite(exchange, membership, user);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <OperatorExchangeTabs
        exchangeId={exchange.id}
        active="edit"
        exchangeKind={exchange.kind}
        showEventPickup={exchange.kind === ExchangeKind.EVENT && membership != null}
        showEventDesk={eventDesk}
        showPrivateInvites={privateInvites}
      />

      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Operators</p>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
          Edit exchange
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {superUser
            ? "Changing type to group demotes all event managers to members on this hub."
            : "You can update the name, description, event date, and logo. Type and visibility are set by platform admins."}
        </p>
      </div>

      {errorMessage ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {errorMessage}
        </div>
      ) : null}

      <form action={updateExchangeAction} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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

          {superUser ? (
            <>
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
            </>
          ) : null}

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-700">Allowed item types</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <input type="checkbox" name="allowCoral" className="mt-0.5" defaultChecked={exchange.allowCoral} />
              <span className="text-sm text-slate-700">Coral</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <input type="checkbox" name="allowFish" className="mt-0.5" defaultChecked={exchange.allowFish} />
              <span className="text-sm text-slate-700">Fish</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <input
                type="checkbox"
                name="allowEquipment"
                className="mt-0.5"
                defaultChecked={exchange.allowEquipment}
              />
              <span className="text-sm text-slate-700">Gear</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <input
                type="checkbox"
                name="allowItemsForSale"
                className="mt-0.5"
                defaultChecked={exchange.allowItemsForSale}
              />
              <span className="text-sm text-slate-700">Allow for sale listings (external links)</span>
            </label>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-700">Who can join this exchange</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <input
                type="checkbox"
                name="allowNormalMembersToJoin"
                className="mt-0.5"
                defaultChecked={exchange.allowNormalMembersToJoin}
              />
              <span className="text-sm text-slate-700">Normal members</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <input
                type="checkbox"
                name="allowOnlineRetailersToJoin"
                className="mt-0.5"
                defaultChecked={exchange.allowOnlineRetailersToJoin}
              />
              <span className="text-sm text-slate-700">Online retailers</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <input
                type="checkbox"
                name="allowLocalFishStoresToJoin"
                className="mt-0.5"
                defaultChecked={exchange.allowLocalFishStoresToJoin}
              />
              <span className="text-sm text-slate-700">Local fish stores</span>
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
