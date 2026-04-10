import { NextResponse, type NextRequest } from "next/server";
import { consumeAuthNextCookie } from "@/lib/auth-next-cookie";
import { consumeMagicLink, createSession } from "@/lib/auth";
import { setOnboardingNextCookie } from "@/lib/onboarding-next-cookie";
import { getRequestOrigin } from "@/lib/request-origin";

export async function GET(request: NextRequest) {
  try {
    const base = await getRequestOrigin();
    const urlFromRequest = new URL(request.url);
    const reqOrigin = urlFromRequest.origin;

    // #region agent log
    const originPayload = {
      sessionId: "042f52",
      runId: "pre-fix",
      hypothesisId: "H1",
      location: "auth/verify/route.ts:origin",
      message: "redirect base vs request origin",
      data: {
        base,
        reqOrigin,
        nextUrlOrigin: request.nextUrl.origin,
        hasPublicAppUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
        baseMatchesReq: base === reqOrigin,
      },
      timestamp: Date.now(),
    };
    console.error("[reefx-debug]", JSON.stringify(originPayload));
    fetch("http://127.0.0.1:7266/ingest/6a427adc-5f5b-45b5-b3d1-f343e48d9d61", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "042f52" },
      body: JSON.stringify(originPayload),
    }).catch(() => {});
    // #endregion

    const { searchParams } = urlFromRequest;
    const token = searchParams.get("token");

    if (!token) {
      // #region agent log
      const noTokenPayload = {
        sessionId: "042f52",
        runId: "pre-fix",
        hypothesisId: "H5",
        location: "auth/verify/route.ts:no-token",
        message: "redirect no token",
        data: { href: new URL("/auth/login?error=invalid-token", base).toString() },
        timestamp: Date.now(),
      };
      console.error("[reefx-debug]", JSON.stringify(noTokenPayload));
      fetch("http://127.0.0.1:7266/ingest/6a427adc-5f5b-45b5-b3d1-f343e48d9d61", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "042f52" },
        body: JSON.stringify(noTokenPayload),
      }).catch(() => {});
      // #endregion
      return NextResponse.redirect(new URL("/auth/login?error=invalid-token", base));
    }

    const user = await consumeMagicLink(token);

    // #region agent log
    const consumePayload = {
      sessionId: "042f52",
      runId: "pre-fix",
      hypothesisId: "H4",
      location: "auth/verify/route.ts:after-consume",
      message: "consumeMagicLink result",
      data: { ok: Boolean(user), userId: user?.id ?? null },
      timestamp: Date.now(),
    };
    console.error("[reefx-debug]", JSON.stringify(consumePayload));
    fetch("http://127.0.0.1:7266/ingest/6a427adc-5f5b-45b5-b3d1-f343e48d9d61", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "042f52" },
      body: JSON.stringify(consumePayload),
    }).catch(() => {});
    // #endregion

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
    const redirectAbs = new URL(destination, base).toString();

    // #region agent log
    const redirectPayload = {
      sessionId: "042f52",
      runId: "pre-fix",
      hypothesisId: "H2",
      location: "auth/verify/route.ts:before-redirect",
      message: "final redirect target",
      data: { destination, redirectAbs, base },
      timestamp: Date.now(),
    };
    console.error("[reefx-debug]", JSON.stringify(redirectPayload));
    fetch("http://127.0.0.1:7266/ingest/6a427adc-5f5b-45b5-b3d1-f343e48d9d61", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "042f52" },
      body: JSON.stringify(redirectPayload),
    }).catch(() => {});
    // #endregion

    const redirectRes = NextResponse.redirect(new URL(destination, base));
    await createSession(user.id, redirectRes);
    return redirectRes;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const cause = err.cause;
    const causeDetail =
      cause instanceof Error
        ? { name: cause.name, message: cause.message, stack: cause.stack }
        : cause !== undefined
          ? { raw: String(cause) }
          : null;
    // #region agent log
    const errPayload = {
      sessionId: "042f52",
      runId: "pre-fix",
      hypothesisId: "H3",
      location: "auth/verify/route.ts:catch",
      message: "handler error",
      data: {
        name: err.name,
        message: err.message,
        cause: causeDetail,
      },
      timestamp: Date.now(),
    };
    console.error("[reefx-debug]", JSON.stringify(errPayload));
    fetch("http://127.0.0.1:7266/ingest/6a427adc-5f5b-45b5-b3d1-f343e48d9d61", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "042f52" },
      body: JSON.stringify(errPayload),
    }).catch(() => {});
    // #endregion
    throw e;
  }
}
