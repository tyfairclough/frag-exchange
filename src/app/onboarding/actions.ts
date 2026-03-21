"use server";

import { ContactPreference, OnboardingPath } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";

function str(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function completeOnboardingAction(formData: FormData) {
  const user = await requireUser();

  const LEGAL_VERSION = "2026-03-20";

  const alias = str(formData.get("alias"));
  const avatarEmoji = str(formData.get("avatarEmoji"));
  const tos = formData.get("tosAccepted") === "on";
  const privacy = formData.get("privacyAccepted") === "on";
  const contactPreference = str(formData.get("contactPreference")) === "SMS" ? ContactPreference.SMS : ContactPreference.EMAIL;
  const onboardingPath =
    str(formData.get("onboardingPath")) === OnboardingPath.GROUP_AND_EVENT
      ? OnboardingPath.GROUP_AND_EVENT
      : OnboardingPath.EVENT_ONLY;

  if (!tos) {
    redirect("/onboarding?error=tos");
  }
  if (!privacy) {
    redirect("/onboarding?error=privacy");
  }

  const line1 = str(formData.get("line1"));
  const line2 = str(formData.get("line2"));
  const town = str(formData.get("town"));
  const region = str(formData.get("region"));
  const postalCode = str(formData.get("postalCode"));
  const countryCode = str(formData.get("countryCode")).toUpperCase();

  const anyAddressField = Boolean(line1 || line2 || town || region || postalCode || countryCode);
  const addressComplete = Boolean(line1 && town && postalCode && countryCode.length === 2);

  const needsAddress = onboardingPath === OnboardingPath.GROUP_AND_EVENT;
  if (needsAddress && !addressComplete) {
    redirect("/onboarding?error=address");
  }
  if (!needsAddress && anyAddressField && !addressComplete) {
    redirect("/onboarding?error=address-partial");
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
        contactPreference,
        onboardingPath,
        onboardingCompletedAt: now,
      },
    });

    if (needsAddress || (!needsAddress && addressComplete)) {
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
    } else {
      await tx.userAddress.deleteMany({ where: { userId: user.id } });
    }
  });

  redirect("/me");
}
