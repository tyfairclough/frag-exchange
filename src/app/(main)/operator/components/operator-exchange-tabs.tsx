import Link from "next/link";
import { ExchangeKind } from "@/generated/prisma/enums";

export type OperatorExchangeTabId =
  | "dashboard"
  | "invite"
  | "edit"
  | "reefers"
  | "trades"
  | "event-pickup"
  | "event-desk"
  | "explore";

type TabItem = { id: OperatorExchangeTabId; label: string; href: string };

type Props = {
  exchangeId: string;
  active: OperatorExchangeTabId;
  exchangeKind: ExchangeKind;
  showEventPickup: boolean;
  showEventDesk: boolean;
  /** Private hubs: super admins and event managers can issue single-use invite links */
  showPrivateInvites?: boolean;
  /** Full href for the Explore tab (preserves filters); defaults to `?exchangeId=` only */
  exploreHref?: string;
};

function tabLinkClass(active: boolean) {
  return [
    "inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-xl px-3.5 text-sm font-semibold transition",
    active
      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
      : "text-slate-600 hover:bg-white/60 hover:text-slate-900",
  ].join(" ");
}

export function OperatorExchangeTabs({
  exchangeId,
  active,
  exchangeKind,
  showEventPickup,
  showEventDesk,
  showPrivateInvites = false,
  exploreHref: exploreHrefProp,
}: Props) {
  const enc = encodeURIComponent(exchangeId);
  const exploreHref = exploreHrefProp ?? `/explore?exchangeId=${enc}`;

  const items: TabItem[] = [
    { id: "dashboard", label: "Dashboard", href: `/operator/${enc}` },
  ];

  if (showPrivateInvites) {
    items.push({ id: "invite", label: "Invites", href: `/operator/${enc}/invite` });
  }

  items.push(
    { id: "edit", label: "Edit details", href: `/exchanges/${enc}/edit` },
    { id: "reefers", label: "Reefers", href: `/exchanges/${enc}/reefers` },
    { id: "trades", label: "Trades", href: `/exchanges/${enc}/trades` },
  );

  if (exchangeKind === ExchangeKind.EVENT && showEventPickup) {
    items.push({
      id: "event-pickup",
      label: "Event pickup",
      href: `/exchanges/${enc}/event-pickup`,
    });
  }

  if (exchangeKind === ExchangeKind.EVENT && showEventDesk) {
    items.push({
      id: "event-desk",
      label: "Event desk",
      href: `/exchanges/${enc}/event-ops`,
    });
  }

  items.push({ id: "explore", label: "Explore listings", href: exploreHref });

  return (
    <nav
      aria-label="Operator"
      className="rounded-2xl border border-slate-200 bg-slate-100/90 p-1.5 shadow-sm sm:p-2"
    >
      <div className="-mx-0.5 flex gap-1 overflow-x-auto px-0.5 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={tabLinkClass(isActive)}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
