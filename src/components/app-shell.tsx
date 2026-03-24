"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";

const DEFAULT_TITLE = "Frag Exchange";

function getExchangeIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/exchanges\/([^/]+)/);
  if (!match) {
    return null;
  }
  const id = decodeURIComponent(match[1]);
  if (id === "new" || id === "browse" || id === "invite") {
    return null;
  }
  return id;
}

type AppShellProfile = {
  aliasLabel: string;
  avatarEmoji: string;
};

export function AppShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: AppShellProfile;
}) {
  const pathname = usePathname();
  const exchangeId = useMemo(() => getExchangeIdFromPathname(pathname), [pathname]);
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
        return (await res.json()) as { title?: string };
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

  const shellTitle = exchangeId ? (exchangeTitle ?? DEFAULT_TITLE) : DEFAULT_TITLE;
  const meActive = pathname === "/me";

  return (
    <div className="flex min-h-dvh flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/85 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <Link
            href="/exchanges"
            className="flex min-h-11 min-w-11 items-center gap-2 rounded-lg px-1 py-2 text-lg font-semibold tracking-tight text-slate-900"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
              FE
            </span>
            <span className="hidden sm:inline" title={shellTitle}>
              {shellTitle}
            </span>
          </Link>
          <Link
            href="/me"
            aria-current={meActive ? "page" : undefined}
            className={`inline-flex max-w-[min(100%,14rem)] items-center gap-2 rounded-full border py-1 pl-3 pr-1 text-sm font-medium shadow-sm transition-colors active:bg-slate-100 ${
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
        </div>
      </header>

      <main className="relative flex flex-1 flex-col px-0 sm:px-2">{children}</main>

      <BottomNav />
    </div>
  );
}
