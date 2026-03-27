import { AppShell } from "@/components/app-shell";
import { ExploreShellProvider } from "@/components/explore-shell-context";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  const aliasLabel = user.alias?.trim() || "Me";

  return (
    <ExploreShellProvider>
      <AppShell profile={{ aliasLabel, avatarEmoji: user.avatarEmoji ?? "🐠" }}>{children}</AppShell>
    </ExploreShellProvider>
  );
}
