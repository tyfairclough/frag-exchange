"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/exchanges", label: "Home", icon: HomeIcon },
  { href: "/explore", label: "Explore", icon: CompassIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur supports-[backdrop-filter]:bg-white/90 md:left-1/2 md:max-w-2xl md:-translate-x-1/2 md:rounded-t-2xl md:border md:border-b-0 md:shadow-lg"
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around gap-1 px-2 pt-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
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
    </nav>
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
