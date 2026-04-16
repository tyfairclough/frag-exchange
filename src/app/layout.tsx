import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { Suspense } from "react";
import { AppToaster } from "@/components/app-toaster";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { DatabaseBootGate } from "@/components/database-boot-gate";
import { PostHogPageview } from "@/components/posthog-pageview";
import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://reefx.net"),
  title: {
    default: "REEFX",
    template: "%s · REEFX",
  },
  description: "REEFX — coral frags, swaps, and exchanges for reefers.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f1c1a",
};

const posthogEnabled = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NextTopLoader
        color="#0f766e"
        height={3}
        showSpinner={false}
        shadow="0 0 10px #0f766e,0 0 5px #0f766e"
        zIndex={1600}
      />
      <DatabaseBootGate>{children}</DatabaseBootGate>
      <AppToaster />
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="fraglight" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-white text-slate-600 font-sans">
        {posthogEnabled ? (
          <PostHogProvider>
            <Suspense>
              <PostHogPageview />
            </Suspense>
            <AppShell>{children}</AppShell>
            <CookieConsentBanner />
          </PostHogProvider>
        ) : (
          <AppShell>{children}</AppShell>
        )}
      </body>
    </html>
  );
}
