"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { ExploreHeaderChrome } from "@/components/explore-header-chrome";
import { getExchangeIdFromPathname } from "@/lib/exchange-path";

const DEFAULT_TITLE = "Frag Exchange";

type AppShellProfile = {
  aliasLabel: string;
  avatarEmoji: string;
};

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
        return (await res.json()) as { title?: string; logoUrl?: string | null };
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
      <span className="min-w-0 truncate font-semibold tracking-tight text-[#122B49] sm:max-w-[12rem]" title="Frag Exchange">
        Frag Exchange
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

  useEffect(() => {
    if (!exchangeId) {
      return;
    }
    const controller = new AbortController();
    void fetch(`/api/exchanges/${encodeURIComponent(exchangeId)}/shell-title`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (res) => (res.ok ? ((await res.json()) as { logoUrl?: string | null }) : null))
      .then((payload) => {
        setExchangeLogoUrl(payload?.logoUrl ?? null);
      })
      .catch(() => {
        setExchangeLogoUrl(null);
      });
    return () => controller.abort();
  }, [exchangeId]);

  const shellLogoUrl = exchangeId ? exchangeLogoUrl : null;

  return (
    <Link
      href="/exchanges"
      className="flex min-h-11 min-w-11 shrink-0 items-center gap-2 rounded-lg px-1 py-2 text-lg font-semibold tracking-tight text-slate-900"
    >
      {shellLogoUrl ? (
        <img
          src={shellLogoUrl}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 rounded-md object-cover"
          aria-hidden
        />
      ) : (
        <img
          src="/fragswap_logo.svg"
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 object-contain"
          aria-hidden
        />
      )}
      <ShellTitleInner />
    </Link>
  );
}

function ShellProfileLink({
  profile,
  meActive,
}: {
  profile: AppShellProfile;
  meActive: boolean;
}) {
  return (
    <Link
      href="/me"
      aria-current={meActive ? "page" : undefined}
      className={`inline-flex max-w-[120px] shrink-0 items-center gap-2 rounded-full border py-1 pl-3 pr-1 text-sm font-medium shadow-sm transition-colors active:bg-slate-100 ${
        meActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100"
          : "border-[#e0e0e0] bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
      }`}
      aria-label={`Profile: ${profile.aliasLabel}`}
    >
      <span className="min-w-0 flex-1 truncate text-left">{profile.aliasLabel}</span>
      <span
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-lg leading-none text-white"
        aria-hidden
      >
        {profile.avatarEmoji}
      </span>
    </Link>
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
}: {
  children: React.ReactNode;
  profile: AppShellProfile;
}) {
  const pathname = usePathname();
  const meActive = pathname === "/me";
  const isExplore = pathname === "/explore";
  const hideBottomNav = pathname === "/my-corals/new";

  return (
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
                  <ShellProfileLink profile={profile} meActive={meActive} />
                </div>
                <HeaderExploreChrome />
              </div>
              <div className="hidden items-center justify-between gap-3 md:flex">
                <ShellBrandLink />
                <HeaderExploreChrome />
                <ShellProfileLink profile={profile} meActive={meActive} />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <ShellBrandLink />
              <HeaderExploreChrome />
              <ShellProfileLink profile={profile} meActive={meActive} />
            </div>
          )}
        </div>
      </header>

      <main className="relative flex flex-1 flex-col px-0 sm:px-2">{children}</main>

      {hideBottomNav ? null : <BottomNav />}
    </div>
  );
}
