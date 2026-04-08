"use server";

import { revalidatePath } from "next/cache";
import zxcvbn from "zxcvbn";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { getRequestOrigin } from "@/lib/request-origin";
import { sendPasswordChangedNoticeEmail } from "@/lib/send-password-changed-email";
import { consumeRateLimitToken } from "@/lib/rate-limit";
import { refreshTownCenterForUserAddress } from "@/lib/town-geocode";
import { sliceForZxcvbn } from "@/lib/zxcvbn-password";

function str(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function updateUserAddressAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();

  const line1 = str(formData.get("line1"));
  const line2 = str(formData.get("line2"));
  const town = str(formData.get("town"));
  const region = str(formData.get("region"));
  const postalCode = str(formData.get("postalCode"));
  const countryCode = str(formData.get("countryCode")).toUpperCase();
  const addressComplete = Boolean(line1 && town && postalCode && countryCode.length === 2);

  if (!addressComplete) {
    return {
      ok: false,
      error: "Complete address line 1, town, postal code, and a two-letter country code.",
    };
  }

  await getPrisma().userAddress.upsert({
    where: { userId: user.id },
    update: {
      line1,
      line2: line2 || null,
      town,
      region: region || null,
      postalCode,
      countryCode,
    },
    create: {
      userId: user.id,
      line1,
      line2: line2 || null,
      town,
      region: region || null,
      postalCode,
      countryCode,
    },
  });

  try {
    await refreshTownCenterForUserAddress(user.id);
  } catch {
    // Geocoding is best-effort.
  }

  revalidatePath("/me");
  return { ok: true };
}

function zxcvbnUserInputsForUser(user: { email: string; alias: string | null }): string[] {
  const parts: string[] = [user.email.trim().toLowerCase()];
  const alias = user.alias?.trim();
  if (alias) {
    parts.push(alias);
  }
  return parts.filter((s) => s.length > 0);
}

export async function setUserPasswordAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();

  const pwdRaw = formData.get("password");
  const pwd = typeof pwdRaw === "string" ? pwdRaw : "";

  if (!pwd) {
    return { ok: false, error: "Enter a new password." };
  }

  if (!consumeRateLimitToken(`me:password:user:${user.id}`, 10, 15 * 60 * 1000)) {
    return { ok: false, error: "Too many password changes. Try again in a few minutes." };
  }

  const sliced = sliceForZxcvbn(pwd);
  const userInputs = zxcvbnUserInputsForUser(user);
  const strength = zxcvbn(sliced, userInputs);
  if (strength.score !== 4) {
    return {
      ok: false,
      error: "Password must reach the strongest strength rating (4 of 4) before it can be saved.",
    };
  }

  const passwordHash = await hashPassword(pwd);
  await getPrisma().user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  const siteUrl = await getRequestOrigin();
  try {
    const sent = await sendPasswordChangedNoticeEmail({ to: user.email, siteUrl });
    if (!sent.ok) {
      console.error("[setUserPasswordAction] password notice email failed:", sent);
    }
  } catch (e) {
    console.error("[setUserPasswordAction] password notice email threw:", e);
  }

  revalidatePath("/me");
  return { ok: true };
}

const AVATAR_CHOICES = ["🐠", "🪸", "🐙", "🦀", "🐡", "🐟", "🦐", "🪼"] as const;

export async function setUserAvatarAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const avatarRaw = formData.get("avatarEmoji");
  const avatar = typeof avatarRaw === "string" ? avatarRaw.trim() : "";

  if (!avatar || !AVATAR_CHOICES.includes(avatar as (typeof AVATAR_CHOICES)[number])) {
    return { ok: false, error: "Choose one of the available avatars." };
  }

  await getPrisma().user.update({
    where: { id: user.id },
    data: { avatarEmoji: avatar },
  });

  revalidatePath("/me");
  return { ok: true };
}
