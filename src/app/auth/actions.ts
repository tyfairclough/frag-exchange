"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { clearSession, createMagicLink } from "@/lib/auth";

export async function requestMagicLinkAction(formData: FormData) {
  const emailInput = formData.get("email");
  const email = typeof emailInput === "string" ? emailInput.trim().toLowerCase() : "";

  if (!email || !email.includes("@")) {
    redirect("/auth/login?error=invalid-email");
  }

  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const { token } = await createMagicLink(email, ip);

  const debugQuery =
    process.env.NODE_ENV !== "production" ? `&debugToken=${encodeURIComponent(token)}` : "";

  redirect(`/auth/check-email?email=${encodeURIComponent(email)}${debugQuery}`);
}

export async function signOutAction() {
  await clearSession();
  redirect("/auth/login");
}
