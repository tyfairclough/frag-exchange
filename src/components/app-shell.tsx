"use client";

import { AppLink } from "@/components/app-link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { InventoryEditBottomNavProvider } from "@/components/inventory-edit-bottom-nav-context";
import { ExploreHeaderChrome } from "@/components/explore-header-chrome";
import { signOutAction } from "@/app/auth/actions";
import { getExchangeIdFromPathname } from "@/lib/exchange-path";

const DEFAULT_TITLE = "REEFxCHANGE";

type AppShellProfile = {
  aliasLabel: string;
  avatarEmoji: string;
};

type OperatorManagedExchange = { id: string; name: string };

function SwitchExchangeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-[1.1em] w-[1.1em] opacity-70"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    </svg>
  );
}

function ShellTitleLabel({ title, showSwitchIcon = true }: { title: string; showSwitchIcon?: boolean }) {
  return (
    <span className="hidden min-w-0 sm:inline-flex sm:items-center sm:gap-1.5">
      <span className="truncate" title={title}>
        {title}
      </span>
      {showSwitchIcon ? (
        <span
          className="tooltip tooltip-bottom shrink-0 text-slate-500"
          data-tip="Switch exchange"
          aria-hidden
        >
          <SwitchExchangeIcon />
        </span>
      ) : null}
    </span>
  );
}

function ShellTitleInner() {
  const pathname = usePathname();

  const exchangeId = useMemo(() => {
    if (pathname === "/explore") {
      return null;
    }
    return getExchangeIdFromPathname(pathname);
  }, [pathname]);

  const [exchangeTitle, setExchangeTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!exchangeId) {
      return;
    }

    const controller = new AbortController();
    void fetch(`/api/exchanges/${encodeURIComponent(exchangeId)}/shell-title`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) {
          return null;
        }
        return (await res.json()) as { title?: string; logoUrl?: string | null; logoSrcSet?: string };
      })
      .then((payload) => {
        if (payload?.title) {
          setExchangeTitle(payload.title);
          return;
        }
        setExchangeTitle(null);
      })
      .catch(() => {
        setExchangeTitle(null);
      });

    return () => {
      controller.abort();
    };
  }, [exchangeId]);

  if (pathname === "/explore") {
    return (
      <span className="min-w-0 truncate font-semibold tracking-tight text-[#122B49] sm:max-w-[12rem]" title="REEFxCHANGE">
        REEFxCHANGE
      </span>
    );
  }

  const shellTitle = exchangeId ? (exchangeTitle ?? DEFAULT_TITLE) : DEFAULT_TITLE;

  const showSwitchIcon = pathname !== "/exchanges";

  return <ShellTitleLabel title={shellTitle} showSwitchIcon={showSwitchIcon} />;
}

function ShellBrandLink() {
  const pathname = usePathname();
  const exchangeId = pathname === "/explore" ? null : getExchangeIdFromPathname(pathname);
  const [exchangeLogoUrl, setExchangeLogoUrl] = useState<string | null>(null);
  const [exchangeLogoSrcSet, setExchangeLogoSrcSet] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!exchangeId) {
      return;
    }
    const controller = new AbortController();
    void fetch(`/api/exchanges/${encodeURIComponent(exchangeId)}/shell-title`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (res) => (res.ok ? ((await res.json()) as { logoUrl?: string | null; logoSrcSet?: string }) : null))
      .then((payload) => {
        setExchangeLogoUrl(payload?.logoUrl ?? null);
        setExchangeLogoSrcSet(payload?.logoSrcSet);
      })
      .catch(() => {
        setExchangeLogoUrl(null);
        setExchangeLogoSrcSet(undefined);
      });
    return () => controller.abort();
  }, [exchangeId]);

  const shellLogoUrl = exchangeId ? exchangeLogoUrl : null;
  const shellLogoSrcSet = exchangeId ? exchangeLogoSrcSet : undefined;

  return (
    <AppLink
      href="/exchanges"
      className="flex min-h-11 min-w-11 shrink-0 items-center gap-2 rounded-lg px-1 py-2 text-lg font-semibold tracking-tight text-slate-900"
    >
      {shellLogoUrl ? (
        <img
          src={shellLogoUrl}
          srcSet={shellLogoSrcSet}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-md object-cover"
          aria-hidden
        />
      ) : (
        <img
          src="/reefx_logo.svg"
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 object-contain"
          aria-hidden
        />
      )}
      <ShellTitleInner />
    </AppLink>
  );
}

function profilePillClass(active: boolean) {
  return active
    ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100"
    : "border-[#e0e0e0] bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50";
}

function ShellProfileMenu({
  profile,
  showAdminLink,
  operatorManagedExchanges,
}: {
  profile: AppShellProfile;
  showAdminLink: boolean;
  operatorManagedExchanges: OperatorManagedExchange[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const meActive = pathname === "/me" || pathname.startsWith("/me/");
  const adminActive = pathname.startsWith("/admin");
  const operatorActive = pathname === "/operator" || pathname.startsWith("/operator/");
  const sectionActive = meActive || adminActive || operatorActive;
  const manageExchangeHref =
    operatorManagedExchanges.length === 1
      ? `/operator/${encodeURIComponent(operatorManagedExchanges[0].id)}`
      : "/operator";

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Profile menu: ${profile.aliasLabel}`}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex max-w-[140px] items-center gap-1 rounded-full border py-1 pl-1.5 pr-3 text-sm font-medium shadow-sm transition-colors active:bg-slate-100 ${profilePillClass(sectionActive)}`}
      >
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-lg leading-none text-white"
          aria-hidden
        >
          {profile.avatarEmoji}
        </span>
        <span className="min-w-0 flex-1 truncate text-left">{profile.aliasLabel}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className={`shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <ul
          role="menu"
          className="absolute right-0 z-50 mt-1 min-w-[10rem] rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          <li role="none">
            <AppLink
              href="/me"
              role="menuitem"
              aria-current={meActive ? "page" : undefined}
              className="block px-4 py-2.5 text-sm text-slate-800 hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              Me
            </AppLink>
          </li>
          {operatorManagedExchanges.length > 0 ? (
            <li role="none">
              <AppLink
                href={manageExchangeHref}
                role="menuitem"
                aria-current={operatorActive ? "page" : undefined}
                className="block px-4 py-2.5 text-sm text-slate-800 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                Manage exchange
              </AppLink>
            </li>
          ) : null}
          {showAdminLink ? (
            <li role="none">
              <AppLink
                href="/admin"
                role="menuitem"
                aria-current={adminActive ? "page" : undefined}
                className="block px-4 py-2.5 text-sm text-slate-800 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                Admin
              </AppLink>
            </li>
          ) : null}
          <li role="none">
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="block w-full px-4 py-2.5 text-left text-sm text-slate-800 hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

function ShellProfileArea({
  profile,
  showSuperAdminMenu,
  operatorManagedExchanges,
}: {
  profile: AppShellProfile;
  showSuperAdminMenu: boolean;
  operatorManagedExchanges: OperatorManagedExchange[];
}) {
  return (
    <ShellProfileMenu
      profile={profile}
      showAdminLink={showSuperAdminMenu}
      operatorManagedExchanges={operatorManagedExchanges}
    />
  );
}

function HeaderExploreChrome() {
  return (
    <Suspense fallback={null}>
      <ExploreHeaderChrome />
    </Suspense>
  );
}

export function AppShell({
  children,
  profile,
  showSuperAdminMenu = false,
  operatorManagedExchanges = [],
}: {
  children: React.ReactNode;
  profile: AppShellProfile;
  showSuperAdminMenu?: boolean;
  operatorManagedExchanges?: OperatorManagedExchange[];
}) {
  const pathname = usePathname();
  const isExplore = pathname === "/explore";
  const hideBottomNav = pathname === "/my-items/new" || pathname === "/my-corals/new";

  return (
    <InventoryEditBottomNavProvider>
      <div
        className={
          hideBottomNav
            ? "flex min-h-dvh flex-col"
            : "flex min-h-dvh flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))]"
        }
      >
        <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/85 sm:px-6">
          <div className="mx-auto w-full max-w-6xl">
            {isExplore ? (
              <>
                <div className="flex flex-col gap-2 md:hidden">
                  <div className="flex items-center justify-between gap-3">
                    <ShellBrandLink />
                    <ShellProfileArea
                      profile={profile}
                      showSuperAdminMenu={showSuperAdminMenu}
                      operatorManagedExchanges={operatorManagedExchanges}
                    />
                  </div>
                  <HeaderExploreChrome />
                </div>
                <div className="hidden items-center justify-between gap-3 md:flex">
                  <ShellBrandLink />
                  <HeaderExploreChrome />
                  <ShellProfileArea
                    profile={profile}
                    showSuperAdminMenu={showSuperAdminMenu}
                    operatorManagedExchanges={operatorManagedExchanges}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <ShellBrandLink />
                <HeaderExploreChrome />
                <ShellProfileArea
                  profile={profile}
                  showSuperAdminMenu={showSuperAdminMenu}
                  operatorManagedExchanges={operatorManagedExchanges}
                />
              </div>
            )}
          </div>
        </header>

        <main className="relative flex flex-1 flex-col px-0 sm:px-2">{children}</main>

        {hideBottomNav ? null : <BottomNav profile={profile} />}
      </div>
    </InventoryEditBottomNavProvider>
  );
}
