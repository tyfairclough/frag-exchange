import Link from "next/link";

export const MARKETING_NAVY = "#0B1E3B";
export const MARKETING_CTA_GREEN = "#22B41C";
export const MARKETING_MUTED_BOX = "#F1F3F5";
export const MARKETING_FOOTER_BG = "#ECEEF1";
export const MARKETING_LINK_BLUE = "#1D4ED8";

export function CoralLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static brand SVG from /public
    <img
      src="/reefx_logo.svg"
      alt=""
      width={36}
      height={36}
      className={`object-contain ${className ?? ""}`.trim()}
      aria-hidden
    />
  );
}

export function MarketingSiteHeader() {
  return (
    <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <CoralLogo className="shrink-0" />
          <span className="text-lg font-semibold tracking-tight sm:text-xl" style={{ color: MARKETING_NAVY }}>
            REEFX
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide"
            style={{ backgroundColor: "#E0F2FE", color: "#0369A1" }}
          >
            Beta
          </span>
        </Link>
        <Link
          href="/auth/login"
          className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Sign-in
        </Link>
      </div>
    </header>
  );
}

export function MarketingSiteFooter() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <footer className="border-t border-slate-200/80" style={{ backgroundColor: MARKETING_FOOTER_BG }}>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <CoralLogo className="h-8 w-8 shrink-0" />
              <span className="text-base font-semibold" style={{ color: MARKETING_NAVY }}>
                REEFX
              </span>
            </Link>
            <p className="mt-3 text-xs text-slate-500">© {new Date().getFullYear()} REEFX</p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:gap-12">
            <div>
              <p className="text-sm font-bold" style={{ color: MARKETING_LINK_BLUE }}>
                Events
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link
                    href="/exchanges/browse?tab=events"
                    className="hover:underline"
                    style={{ color: MARKETING_LINK_BLUE }}
                  >
                    Upcoming events
                  </Link>
                </li>
                <li>
                  <Link href="/auth/login" className="hover:underline" style={{ color: MARKETING_LINK_BLUE }}>
                    Add your event
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: MARKETING_LINK_BLUE }}>
                Pricing
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/#pricing" className="hover:underline" style={{ color: MARKETING_LINK_BLUE }}>
                    Free for hobbyists
                  </Link>
                </li>
                <li>
                  <Link href="/auth/login" className="hover:underline" style={{ color: MARKETING_LINK_BLUE }}>
                    Add REEFX to your event
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: MARKETING_LINK_BLUE }}>
                Support
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/#swap-guide" className="hover:underline" style={{ color: MARKETING_LINK_BLUE }}>
                    FAQs
                  </Link>
                </li>
                <li>
                  {contactEmail ? (
                    <a href={`mailto:${contactEmail}`} className="hover:underline" style={{ color: MARKETING_LINK_BLUE }}>
                      Contact us
                    </a>
                  ) : (
                    <Link href="/auth/login" className="hover:underline" style={{ color: MARKETING_LINK_BLUE }}>
                      Contact us
                    </Link>
                  )}
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: MARKETING_LINK_BLUE }}>
                Legal
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/legal/terms" className="hover:underline" style={{ color: MARKETING_LINK_BLUE }}>
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="/legal/privacy" className="hover:underline" style={{ color: MARKETING_LINK_BLUE }}>
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
