import Link from "next/link";

export const MARKETING_NAVY = "#0B1E3B";
export const MARKETING_CTA_GREEN = "#22B41C";
export const MARKETING_MUTED_BOX = "#F1F3F5";
export const MARKETING_FOOTER_BG = "#ECEEF1";
export const MARKETING_LINK_BLUE = "#1D4ED8";

export function CoralLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="36"
      height="36"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
    >
      <path
        d="M20 4c-2.5 3.2-4 6.8-4 10.5 0 4.2 1.8 8 4.5 10.8C23.2 23.5 25 19.7 25 15.5 25 11.8 23.5 8.2 21 5 20.6 4.5 20.3 4.2 20 4Z"
        fill={MARKETING_NAVY}
        opacity="0.92"
      />
      <path
        d="M9 22c3.5-1.2 7-1 10.2.5-2.8 2.5-5.5 5.8-7.2 9.8C10.5 29.5 9 26 9 22Z"
        fill="#E879A9"
        opacity="0.95"
      />
      <path
        d="M31 22c-3.5-1.2-7-1-10.2.5 2.8 2.5 5.5 5.8 7.2 9.8 2.5-2.8 4-6.3 4-10.3Z"
        fill="#22B41C"
        opacity="0.9"
      />
      <path
        d="M20 26c-1.8 2.2-3 4.8-3.5 7.5h7c-.5-2.7-1.7-5.3-3.5-7.5Z"
        fill="#7C3AED"
        opacity="0.88"
      />
    </svg>
  );
}

export function MarketingSiteHeader() {
  return (
    <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <CoralLogo className="shrink-0" />
          <span className="text-lg font-semibold tracking-tight sm:text-xl" style={{ color: MARKETING_NAVY }}>
            Frag Exchange
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
                Frag Exchange
              </span>
            </Link>
            <p className="mt-3 text-xs text-slate-500">© {new Date().getFullYear()} Frag Exchange</p>
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
                    Add Frag Exchange to your event
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
