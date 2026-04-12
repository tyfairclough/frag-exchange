import { ensureDatabaseReady } from "@/lib/db-warm";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await ensureDatabaseReady();
  return children;
}
