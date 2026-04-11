import { NextResponse } from "next/server";
import { consumeAuthNextCookie } from "@/lib/auth-next-cookie";
import { consumeMagicLink, createSession } from "@/lib/auth";
import { ensureDatabaseReadyUncached } from "@/lib/db-warm";
import { setOnboardingNextCookie } from "@/lib/onboarding-next-cookie";
import { getRequestOrigin } from "@/lib/request-origin";

export async function GET(request: Request) {
  const base = await getRequestOrigin();

  await ensureDatabaseReadyUncached();

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login?error=invalid-token", base));
  }

  const user = await consumeMagicLink(token);

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login?error=invalid-token", base));
  }

  const nextPath = await consumeAuthNextCookie();
  if (nextPath && !user.onboardingCompletedAt) {
    await setOnboardingNextCookie(nextPath);
  }
  const destination =
    nextPath && user.onboardingCompletedAt
      ? nextPath
      : user.onboardingCompletedAt
        ? "/"
        : "/onboarding";
  const redirectRes = NextResponse.redirect(new URL(destination, base));
  await createSession(user.id, redirectRes);
  return redirectRes;
}
