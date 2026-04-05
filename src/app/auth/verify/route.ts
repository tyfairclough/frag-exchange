import { NextResponse } from "next/server";
import { consumeAuthNextCookie } from "@/lib/auth-next-cookie";
import { consumeMagicLink, createSession } from "@/lib/auth";
import { setOnboardingNextCookie } from "@/lib/onboarding-next-cookie";
import { getRequestOrigin } from "@/lib/request-origin";

export async function GET(request: Request) {
  const base = await getRequestOrigin();
  // #region agent log
  {
    let reqHost = "";
    try {
      reqHost = new URL(request.url).host;
    } catch {
      reqHost = "invalid";
    }
    let baseHost = "";
    try {
      baseHost = new URL(base).host;
    } catch {
      baseHost = "invalid";
    }
    fetch("http://127.0.0.1:7372/ingest/8407dbed-5e8e-4bc5-9ee7-94c44eed562d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b57fb3" },
      body: JSON.stringify({
        sessionId: "b57fb3",
        hypothesisId: "H1",
        location: "auth/verify/route.ts:GET",
        message: "redirect base: request.url host vs getRequestOrigin",
        data: { reqHost, baseHost },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login?error=invalid-token", base));
  }

  const user = await consumeMagicLink(token);

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login?error=invalid-token", base));
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
  return NextResponse.redirect(new URL(destination, base));
}
