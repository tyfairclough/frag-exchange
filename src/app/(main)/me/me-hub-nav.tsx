"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function navBtnClass(active: boolean) {
  return `btn min-h-11 rounded-xl ${active ? "btn-primary" : "btn-outline"}`;
}

export function MeHubNav() {
  const pathname = usePathname();
  const preferencesActive = pathname === "/me/preferences";

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Link href="/exchanges" className={navBtnClass(false)}>
        Exchanges
      </Link>
      <Link href="/my-items" className={navBtnClass(false)}>
        My items
      </Link>
      <Link href="/me/preferences" className={navBtnClass(preferencesActive)}>
        Preferences
      </Link>
    </div>
  );
}
