import { getPrisma } from "@/lib/db";
// Keep as a lightweight optional health probe helper.
export function pingDatabaseOptional(): void {
  void getPrisma()
    .$queryRaw`SELECT 1`
    .catch(() => {});
}
