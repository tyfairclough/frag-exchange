import { ensureDatabaseReady } from "@/lib/db-warm";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await ensureDatabaseReady();
  return children;
}
