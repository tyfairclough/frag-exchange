import { AppLink } from "@/components/app-link";
import { AuroraBrandText } from "@/components/aurora-brand-text";

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

export function MarketingSiteHeaderBrandOnly() {
  return (
    <header className="shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-4 sm:px-6">
        <AppLink href="/" className="flex items-center gap-2.5">
          <CoralLogo className="shrink-0" />
          <AuroraBrandText
            className="text-lg font-semibold tracking-tight sm:text-xl"
            textColor={MARKETING_NAVY}
          />
        </AppLink>
      </div>
    </header>
  );
}

export function MarketingSiteHeader() {
  return (
    <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <AppLink href="/" className="flex items-center gap-2.5">
          <CoralLogo className="shrink-0" />
          <AuroraBrandText
            className="text-lg font-semibold tracking-tight sm:text-xl"
            textColor={MARKETING_NAVY}
          />
        </AppLink>
        <AppLink
          href="/auth/login"
          className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Sign-in
        </AppLink>
      </div>
    </header>
  );
}

export function MarketingSiteFooter() {
  return (
    <footer className="border-t border-slate-200/80" style={{ backgroundColor: MARKETING_FOOTER_BG }}>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div>
            <AppLink href="/" className="flex items-center gap-2">
              <CoralLogo className="h-8 w-8 shrink-0" />
              <AuroraBrandText
                className="text-base font-semibold"
                size="sm"
                textColor={MARKETING_NAVY}
                background={MARKETING_FOOTER_BG}
              />
            </AppLink>
            <p className="mt-3 text-xs text-slate-500">© {new Date().getFullYear()} REEFxCHANGE</p>
          </div>
          <div>
            <div>
              <p className="text-sm font-bold" style={{ color: MARKETING_LINK_BLUE }}>
                Legal
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <AppLink href="/legal/terms" className="hover:underline" style={{ color: MARKETING_LINK_BLUE }}>
                    Terms
                  </AppLink>
                </li>
                <li>
                  <AppLink href="/legal/privacy" className="hover:underline" style={{ color: MARKETING_LINK_BLUE }}>
                    Privacy
                  </AppLink>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
