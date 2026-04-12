import { ensureDatabaseReady } from "@/lib/db-warm";

export const dynamic = "force-dynamic";

export default async function SharedLayout({ children }: { children: React.ReactNode }) {
  await ensureDatabaseReady();
  return children;
}
