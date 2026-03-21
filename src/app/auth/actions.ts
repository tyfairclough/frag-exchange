"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { clearSession, createMagicLink } from "@/lib/auth";
import { getRequestOrigin } from "@/lib/request-origin";
import { sendMagicLinkEmail } from "@/lib/send-magic-link-email";

export async function requestMagicLinkAction(formData: FormData) {
  const emailInput = formData.get("email");
  const email = typeof emailInput === "string" ? emailInput.trim().toLowerCase() : "";

  if (!email || !email.includes("@")) {
    redirect("/auth/login?error=invalid-email");
  }

  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const { token } = await createMagicLink(email, ip);

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
  redirect("/auth/login");
}
