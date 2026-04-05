import { AppShell } from "@/components/app-shell";
import { ExploreShellProvider } from "@/components/explore-shell-context";
import { ExchangeMembershipRole } from "@/generated/prisma/enums";
import { agentDebugLog } from "@/lib/agent-debug-log";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/super-admin";
import { redirect } from "next/navigation";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  // #region agent log
  agentDebugLog("(main)/layout.tsx:MainLayout", "layout_enter", {}, "H3");
  // #endregion
  const user = await requireUser();
  // #region agent log
  agentDebugLog("(main)/layout.tsx:MainLayout", "after_requireUser", { onboardingDone: Boolean(user.onboardingCompletedAt) }, "H3");
  // #endregion
  if (!user.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  const aliasLabel = user.alias?.trim() || "Me";

  let operatorRows;
  try {
    operatorRows = await getPrisma().exchangeMembership.findMany({
      where: { userId: user.id, role: ExchangeMembershipRole.EVENT_MANAGER },
      include: { exchange: { select: { id: true, name: true } } },
      orderBy: { joinedAt: "asc" },
    });
  } catch (e) {
    // #region agent log
    agentDebugLog(
      "(main)/layout.tsx:MainLayout",
      "operator_findMany_threw",
      { errKind: e instanceof Error ? e.constructor.name : typeof e },
      "H3",
    );
    // #endregion
    throw e;
  }
  // #region agent log
  agentDebugLog(
    "(main)/layout.tsx:MainLayout",
    "after_operator_query",
    { operatorRowCount: operatorRows.length },
    "H3",
  );
  // #endregion
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
