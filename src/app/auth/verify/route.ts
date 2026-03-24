import { NextResponse } from "next/server";
import { consumeAuthNextCookie } from "@/lib/auth-next-cookie";
import { consumeMagicLink, createSession } from "@/lib/auth";
import { setOnboardingNextCookie } from "@/lib/onboarding-next-cookie";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login?error=invalid-token", request.url));
  }

  const user = await consumeMagicLink(token);

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login?error=invalid-token", request.url));
  }

  await createSession(user.id);

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
  return NextResponse.redirect(new URL(destination, request.url));
}
