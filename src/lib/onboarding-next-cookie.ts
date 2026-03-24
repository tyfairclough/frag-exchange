import { cookies } from "next/headers";
import { getSafeInternalNextPath } from "@/lib/safe-next-path";

const ONBOARDING_NEXT_COOKIE = "fe_onboarding_next";

export async function setOnboardingNextCookie(path: string) {
  const safePath = getSafeInternalNextPath(path);
  if (!safePath) {
    return;
  }
  const store = await cookies();
  store.set(ONBOARDING_NEXT_COOKIE, safePath, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
}

export async function consumeOnboardingNextCookie(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(ONBOARDING_NEXT_COOKIE)?.value;
  store.delete(ONBOARDING_NEXT_COOKIE);
  return getSafeInternalNextPath(raw ?? undefined);
}

