"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { clearSession, createMagicLink, createSession } from "@/lib/auth";
import { consumeAuthNextCookie } from "@/lib/auth-next-cookie";
import { setOnboardingNextCookie } from "@/lib/onboarding-next-cookie";
import { getRequestOrigin } from "@/lib/request-origin";
import { getPrisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { isDevMagicLinkViaEmail } from "@/lib/dev-magic-link-mode";
import { sendMagicLinkEmail } from "@/lib/send-magic-link-email";
import { consumeRateLimitToken, getRequestIp } from "@/lib/rate-limit";
import { hasCompletedRequiredOnboarding } from "@/lib/onboarding-status";

export async function requestMagicLinkAction(formData: FormData) {
  const ip = await getRequestIp();
  if (!consumeRateLimitToken(`auth:magic:${ip}`, 10, 60 * 60 * 1000)) {
    redirect("/auth/login?error=rate-limit");
  }

  const emailInput = formData.get("email");
  const email = typeof emailInput === "string" ? emailInput.trim().toLowerCase() : "";

  if (!email || !email.includes("@")) {
    redirect("/auth/login?error=invalid-email");
  }

  try {
    const headerStore = await headers();
    const requestIp = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const { token } = await createMagicLink(email, requestIp);

    const origin = await getRequestOrigin();
    const verifyUrl = `${origin}/auth/verify?token=${encodeURIComponent(token)}`;

    const useMailtrapInDev = isDevMagicLinkViaEmail();
    if (process.env.NODE_ENV === "development" && !useMailtrapInDev) {
      console.info(
        `[magic-link] dev debug path — outbound email skipped (set REEFX_DEV_MAGIC_LINK_VIA_EMAIL=true to use Mailtrap). To: ${email}`,
      );
    } else {
      const sent = await sendMagicLinkEmail({ to: email, verifyUrl });
      if (!sent.ok) {
        console.error("[magic-link] outbound email failed", sent.status, sent.body);
      }
    }

    const debugQuery =
      process.env.NODE_ENV === "development" && !useMailtrapInDev
        ? `&debugToken=${encodeURIComponent(token)}`
        : "";

    redirect(`/auth/check-email?email=${encodeURIComponent(email)}${debugQuery}`);
  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error("[requestMagicLinkAction] failed:", e);
    redirect("/auth/login?error=server-unavailable");
  }
}

export async function signOutAction() {
  await clearSession();
  redirect("/");
}

export async function signInWithPasswordAction(formData: FormData) {
  const ip = await getRequestIp();
  if (!consumeRateLimitToken(`auth:password:${ip}`, 25, 15 * 60 * 1000)) {
    redirect("/auth/login?error=rate-limit");
  }

  const emailInput = formData.get("email");
  const passwordInput = formData.get("password");
  const email = typeof emailInput === "string" ? emailInput.trim().toLowerCase() : "";
  const password = typeof passwordInput === "string" ? passwordInput : "";

  if (!email || !email.includes("@") || !password) {
    redirect("/auth/login?error=invalid-credentials");
  }

  try {
    const user = await getPrisma().user.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
        onboardingCompletedAt: true,
        tosAcceptedAt: true,
        privacyAcceptedAt: true,
      },
    });

    if (!user?.passwordHash) {
      redirect("/auth/login?error=invalid-credentials");
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      redirect("/auth/login?error=invalid-credentials");
    }

    await createSession(user.id);

    const nextPath = await consumeAuthNextCookie();
    const hasCompletedOnboarding = hasCompletedRequiredOnboarding(user);
    if (nextPath && !hasCompletedOnboarding) {
      await setOnboardingNextCookie(nextPath);
    }
    const destination =
      nextPath && hasCompletedOnboarding ? nextPath : hasCompletedOnboarding ? "/" : "/onboarding";
    redirect(destination);
  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error("[signInWithPasswordAction] failed:", e);
    redirect("/auth/login?error=server-unavailable");
  }
}
