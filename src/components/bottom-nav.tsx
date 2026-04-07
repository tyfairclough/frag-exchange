"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getExchangeIdFromPathname } from "@/lib/exchange-path";

type NavIconItem = { key: string; href: string; label: string; kind: "icon"; icon: typeof HomeIcon };
type NavAvatarItem = { key: string; href: string; label: string; kind: "avatar"; avatarEmoji: string };
type NavItem = NavIconItem | NavAvatarItem;

export type BottomNavProfile = { aliasLabel: string; avatarEmoji: string };

function exploreHrefForPath(pathname: string, exploreExchangeIdParam: string | null): string {
  const fromPath = getExchangeIdFromPathname(pathname);
  const scopedId =
    fromPath ?? (pathname === "/explore" ? exploreExchangeIdParam?.trim() || null : null);
  return scopedId ? `/explore?exchangeId=${encodeURIComponent(scopedId)}` : "/explore";
}

function AdminNavLinks() {
  const pathname = usePathname();
  const items: NavIconItem[] = useMemo(
    () => [
      { key: "admin-dash", href: "/admin", label: "Dashboard", kind: "icon", icon: DashboardIcon },
      { key: "admin-users", href: "/admin/users", label: "Users", kind: "icon", icon: UsersIcon },
      { key: "admin-exchanges", href: "/admin/exchanges", label: "Exchanges", kind: "icon", icon: StackIcon },
    ],
    [],
  );

  return (
    <ul className="mx-auto flex max-w-2xl items-stretch justify-around gap-1 px-2 pt-1">
      {items.map(({ key, href, label, icon: Icon }) => {
        const active =
          href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={key} className="flex-1">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`touch-manipulation flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 transition-colors active:bg-slate-200 ${
                active
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              <Icon />
              <span className="text-[0.65rem] font-medium leading-none">{label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function MeNavAvatar({ emoji }: { emoji: string }) {
  return (
    <span
      className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-slate-800 text-[15px] leading-none text-white"
      aria-hidden
    >
      {emoji}
    </span>
  );
}

function NavLinks({
  exploreExchangeIdParam,
  profile,
}: {
  exploreExchangeIdParam: string | null;
  profile: BottomNavProfile;
}) {
  const pathname = usePathname();
  const nav: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      { key: "exchanges", href: "/exchanges", label: "Exchanges", kind: "icon", icon: HomeIcon },
      {
        key: "explore",
        href: exploreHrefForPath(pathname, exploreExchangeIdParam),
        label: "Explore",
        kind: "icon",
        icon: CompassIcon,
      },
      { key: "add-item", href: "/my-items/new", label: "Add item", kind: "icon", icon: AddCoralIcon },
    ];
    let next = items;
    if (pathname === "/exchanges") {
      next = items.map((i) =>
        i.key === "exchanges"
          ? {
              key: "me",
              href: "/me",
              label: "Me",
              kind: "avatar" as const,
              avatarEmoji: profile.avatarEmoji,
            }
          : i,
      );
    }
    const hideExplore =
      pathname === "/exchanges" ||
      pathname === "/explore" ||
      pathname.startsWith("/explore/") ||
      pathname === "/me" ||
      pathname.startsWith("/me/") ||
      pathname === "/my-items" ||
      pathname.startsWith("/my-items/");
    if (hideExplore) {
      return next.filter((i) => i.key !== "explore");
    }
    return next;
  }, [pathname, exploreExchangeIdParam, profile.avatarEmoji]);

  return (
    <ul className="mx-auto flex max-w-2xl items-stretch justify-around gap-1 px-2 pt-1">
      {nav.map((item) => {
        const { key, href, label } = item;
        const isExplore = key === "explore";
        const active = isExplore
          ? pathname === "/explore"
          : pathname === href || pathname.startsWith(`${href}/`);
        const Icon = item.kind === "icon" ? item.icon : null;
        const glyph =
          item.kind === "avatar" ? (
            <MeNavAvatar emoji={item.avatarEmoji} />
          ) : Icon ? (
            <Icon />
          ) : null;
        return (
          <li key={key} className="flex-1">
            <Link
              href={href}
              {...(key === "me" ? { "aria-label": `Profile: ${profile.aliasLabel}` } : {})}
              aria-current={active ? "page" : undefined}
              className={`touch-manipulation flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 transition-colors active:bg-slate-200 ${
                active
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {glyph}
              <span className="text-[0.65rem] font-medium leading-none">{label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function BottomNavInner({ profile }: { profile: BottomNavProfile }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const exploreExchangeIdParam = pathname === "/explore" ? searchParams.get("exchangeId") : null;
  if (pathname.startsWith("/admin")) {
    return <AdminNavLinks />;
  }
  return <NavLinks exploreExchangeIdParam={exploreExchangeIdParam} profile={profile} />;
}

export function BottomNav({ profile }: { profile: BottomNavProfile }) {
  const fallbackProfile: BottomNavProfile = { aliasLabel: "Me", avatarEmoji: "🐠" };
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur supports-[backdrop-filter]:bg-white/90 md:left-1/2 md:max-w-2xl md:-translate-x-1/2 md:rounded-t-2xl md:border md:border-b-0 md:shadow-lg"
      aria-label="Primary"
    >
      <Suspense fallback={<NavLinks exploreExchangeIdParam={null} profile={fallbackProfile} />}>
        <BottomNavInner profile={profile} />
      </Suspense>
    </nav>
  );
}

function DashboardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M4 13h6V4H4v9Zm10 7h6v-9h-6v9ZM4 21h6v-5H4v5Zm10-13h6V4h-6v4Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm12 2v-1a3 3 0 0 0-3-3h-1m4 7v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M12 3 3 7.5 12 12l9-4.5L12 3Zm0 9L3 7.5M12 12l9-4.5M12 12v9l9-4.5v-9M12 12 3 7.5v9l9 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="m14.5 9.5-2 5-5 2 2-5 5-2Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

function AddCoralIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 8.25v7.5M8.25 12h7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
