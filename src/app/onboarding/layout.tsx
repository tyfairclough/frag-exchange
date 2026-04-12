import { ensureDatabaseReady } from "@/lib/db-warm";

/** Avoid static prerender at build time when DATABASE_URL is not available (e.g. CI). */
export const dynamic = "force-dynamic";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await ensureDatabaseReady();
  return children;
}
