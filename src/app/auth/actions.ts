"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { clearSession, createMagicLink, createSession } from "@/lib/auth";
import { consumeAuthNextCookie } from "@/lib/auth-next-cookie";
import { setOnboardingNextCookie } from "@/lib/onboarding-next-cookie";
import { getRequestOrigin } from "@/lib/request-origin";
import { getPrisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { sendMagicLinkEmail } from "@/lib/send-magic-link-email";
import { consumeRateLimitToken, getRequestIp } from "@/lib/rate-limit";

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

  const headerStore = await headers();
  const requestIp = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const { token } = await createMagicLink(email, requestIp);

  const origin = await getRequestOrigin();
  const verifyUrl = `${origin}/auth/verify?token=${encodeURIComponent(token)}`;

  const sent = await sendMagicLinkEmail({ to: email, verifyUrl });
  if (!sent.ok) {
    console.error("[magic-link] outbound email failed", sent.status, sent.body);
  }

  const debugQuery =
    process.env.NODE_ENV !== "production" ? `&debugToken=${encodeURIComponent(token)}` : "";

  redirect(`/auth/check-email?email=${encodeURIComponent(email)}${debugQuery}`);
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

  const user = await getPrisma().user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, onboardingCompletedAt: true },
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
  if (nextPath && !user.onboardingCompletedAt) {
    await setOnboardingNextCookie(nextPath);
  }
  const destination = nextPath && user.onboardingCompletedAt ? nextPath : user.onboardingCompletedAt ? "/" : "/onboarding";
  redirect(destination);
}
