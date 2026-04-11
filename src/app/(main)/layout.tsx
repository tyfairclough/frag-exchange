import { AppShell } from "@/components/app-shell";
import { ExploreShellProvider } from "@/components/explore-shell-context";
import { ExchangeMembershipRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/db-warm";
import { getPrisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/super-admin";
import { redirect } from "next/navigation";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  await ensureDatabaseReady();
  const user = await requireUser();
  if (!user.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  const aliasLabel = user.alias?.trim() || "Me";

  const operatorRows = await getPrisma().exchangeMembership.findMany({
    where: { userId: user.id, role: ExchangeMembershipRole.EVENT_MANAGER },
    include: { exchange: { select: { id: true, name: true } } },
    orderBy: { joinedAt: "asc" },
  });
  const operatorManagedExchanges = operatorRows.map((r) => ({
    id: r.exchange.id,
    name: r.exchange.name,
  }));

  return (
    <ExploreShellProvider>
      <AppShell
        profile={{ aliasLabel, avatarEmoji: user.avatarEmoji ?? "🐠" }}
        showSuperAdminMenu={isSuperAdmin(user)}
        operatorManagedExchanges={operatorManagedExchanges}
      >
        {children}
      </AppShell>
    </ExploreShellProvider>
  );
}
