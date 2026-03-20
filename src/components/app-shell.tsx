import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-10 border-b border-[var(--shell-border)] bg-base-100/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-base-100/80">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <Link
            href="/"
            className="flex min-h-11 min-w-11 items-center gap-2 rounded-lg px-1 py-2 text-lg font-semibold tracking-tight text-base-content"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-content">
              FE
            </span>
            <span className="hidden sm:inline">Frag Exchange</span>
          </Link>
          <span className="text-xs font-medium uppercase tracking-wider text-base-content/65">Preview</span>
        </div>
      </header>

      <main className="relative flex flex-1 flex-col">{children}</main>

      <BottomNav />
    </div>
  );
}
