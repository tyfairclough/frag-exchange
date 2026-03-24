"use server";

import { OnboardingPath } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { refreshTownCenterForUserAddress } from "@/lib/town-geocode";
import { consumeOnboardingNextCookie } from "@/lib/onboarding-next-cookie";
import { getSafeInternalNextPath } from "@/lib/safe-next-path";
import { autoJoinOnboardingDestination } from "@/lib/auto-join-onboarding-destination";

function str(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function completeOnboardingAction(formData: FormData) {
  const user = await requireUser();

  const LEGAL_VERSION = "2026-03-20";
  const mode = str(formData.get("mode"));

  const line1 = str(formData.get("line1"));
  const line2 = str(formData.get("line2"));
  const town = str(formData.get("town"));
  const region = str(formData.get("region"));
  const postalCode = str(formData.get("postalCode"));
  const countryCode = str(formData.get("countryCode")).toUpperCase();
  const addressComplete = Boolean(line1 && town && postalCode && countryCode.length === 2);

  if (mode === "address") {
    const nextRaw = str(formData.get("next"));
    const nextPath = getSafeInternalNextPath(nextRaw) ?? "/me";
    if (!addressComplete) {
      redirect(`/onboarding?mode=address&next=${encodeURIComponent(nextPath)}&error=address`);
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
      // Geocoding is best-effort; discovery distance filters stay off until coords exist.
    }
    redirect(nextPath);
  }

  const alias = str(formData.get("alias"));
  const avatarEmoji = str(formData.get("avatarEmoji"));
  const tos = formData.get("tosAccepted") === "on";
  const privacy = formData.get("privacyAccepted") === "on";
  if (!tos) {
    redirect("/onboarding?error=tos");
  }
  if (!privacy) {
    redirect("/onboarding?error=privacy");
  }

  const now = new Date();

  await getPrisma().$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        alias: alias || null,
        avatarEmoji: avatarEmoji || null,
        tosAcceptedAt: now,
        tosVersion: LEGAL_VERSION,
        privacyAcceptedAt: now,
        privacyVersion: LEGAL_VERSION,
        onboardingPath: OnboardingPath.EVENT_ONLY,
        onboardingCompletedAt: now,
      },
    });

    if (addressComplete) {
      await tx.userAddress.upsert({
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
    }
  });

  if (addressComplete) {
    try {
      await refreshTownCenterForUserAddress(user.id);
    } catch {
      // Geocoding is best-effort; discovery distance filters stay off until coords exist.
    }
  }

  const destination = (await consumeOnboardingNextCookie()) ?? "/";
  const autoJoin = await autoJoinOnboardingDestination(user.id, destination);
  if (autoJoin.joined && autoJoin.exchangeId) {
    revalidatePath("/exchanges");
    revalidatePath("/exchanges/browse");
    revalidatePath(`/exchanges/${autoJoin.exchangeId}`);
  }
  redirect(autoJoin.destination);
}
