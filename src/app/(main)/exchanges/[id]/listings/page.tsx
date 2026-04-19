import Link from "next/link";
import { notFound } from "next/navigation";
import { CoralProfileStatus, ExchangeKind } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageEventDesk, canViewExchangeDirectory } from "@/lib/super-admin";
import { ExchangeMemberListingsPanel } from "@/app/(main)/exchanges/components/exchange-member-listings-panel";
import { EventDateHighlight } from "@/app/(main)/exchanges/components/event-datetime-highlight";
import { MARKETING_NAVY } from "@/components/marketing/marketing-chrome";

const listingErrors: Record<string, string> = {
  forbidden: "You do not have permission for that action.",
  "listing-forbidden": "Join this exchange before listing items here.",
  "listing-coral": "That item cannot be listed on this exchange.",
  "listing-kind": "That item type is not enabled on this exchange.",
  "listing-invalid": "That listing request was incomplete.",
  "address-required-group": "Add your address to list on group exchanges.",
};

export default async function ExchangeListingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    listed?: string;
    unlisted?: string;
    item?: string;
    error?: string;
    tab?: string;
  }>;
}) {
  const user = await requireUser();
  const { id: exchangeId } = await params;
  const sp = await searchParams;

  const exchange = await getPrisma().exchange.findUnique({
    where: { id: exchangeId },
    include: {
      memberships: {
        where: { userId: user.id },
      },
    },
  });

  if (!exchange) {
    notFound();
  }

  const membership = exchange.memberships[0] ?? null;
  if (!canViewExchangeDirectory(exchange, membership, user) || !membership) {
    notFound();
  }

  const eventDesk = canManageEventDesk(exchange, membership, user);
  const errorMessage = sp.error ? listingErrors[sp.error] ?? "Something went wrong." : null;

  const myListableItems = await getPrisma().inventoryItem.findMany({
    where: {
      userId: user.id,
      profileStatus: CoralProfileStatus.UNLISTED,
      remainingQuantity: { gt: 0 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const myListingsHere = await getPrisma().exchangeListing.findMany({
    where: {
      exchangeId: exchange.id,
      inventoryItem: { userId: user.id },
    },
    include: { inventoryItem: true },
    orderBy: { listedAt: "desc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href={`/exchanges/${encodeURIComponent(exchangeId)}`}
        className="btn btn-ghost btn-sm w-fit px-0 text-primary hover:bg-transparent hover:underline"
      >
        ← Back to Exchange
      </Link>

      <header className="space-y-2">
        <h1 className="text-xl font-semibold" style={{ color: MARKETING_NAVY }}>
          Your listings — {exchange.name}
        </h1>
        {exchange.kind === ExchangeKind.EVENT && exchange.eventDate ? (
          <EventDateHighlight
            eventAtIso={exchange.eventDate.toISOString()}
            formattedDate={exchange.eventDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            eventDeskHref={`/exchanges/${encodeURIComponent(exchange.id)}/event-ops`}
            showEventDeskLink={eventDesk}
            eventPickupHref={`/exchanges/${encodeURIComponent(exchange.id)}/event-pickup`}
          />
        ) : null}
      </header>

      {errorMessage ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      <ExchangeMemberListingsPanel
        exchange={{
          id: exchange.id,
          name: exchange.name,
          allowCoral: exchange.allowCoral,
          allowFish: exchange.allowFish,
          allowEquipment: exchange.allowEquipment,
          allowItemsForSale: exchange.allowItemsForSale,
        }}
        myListableItems={myListableItems}
        myListingsHere={myListingsHere}
        searchParams={{
          listed: sp.listed,
          unlisted: sp.unlisted,
          item: sp.item,
          tab: sp.tab,
        }}
      />
    </div>
  );
}
