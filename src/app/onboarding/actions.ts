"use server";

import { ContactPreference, OnboardingPath } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";

function str(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function completeOnboardingAction(formData: FormData) {
  const user = await requireUser();

  const alias = str(formData.get("alias"));
  const avatarEmoji = str(formData.get("avatarEmoji"));
  const tos = formData.get("tosAccepted") === "on";
  const contactPreference = str(formData.get("contactPreference")) === "SMS" ? ContactPreference.SMS : ContactPreference.EMAIL;
  const onboardingPath =
    str(formData.get("onboardingPath")) === OnboardingPath.GROUP_AND_EVENT
      ? OnboardingPath.GROUP_AND_EVENT
      : OnboardingPath.EVENT_ONLY;

  if (!tos) {
    redirect("/onboarding?error=tos");
  }

  const line1 = str(formData.get("line1"));
  const line2 = str(formData.get("line2"));
  const town = str(formData.get("town"));
  const region = str(formData.get("region"));
  const postalCode = str(formData.get("postalCode"));
  const countryCode = str(formData.get("countryCode")).toUpperCase();

  const needsAddress = onboardingPath === OnboardingPath.GROUP_AND_EVENT;
  if (needsAddress && (!line1 || !town || !postalCode || countryCode.length !== 2)) {
    redirect("/onboarding?error=address");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        alias: alias || null,
        avatarEmoji: avatarEmoji || null,
        tosAcceptedAt: new Date(),
        tosVersion: "2026-03-20",
        contactPreference,
        onboardingPath,
        onboardingCompletedAt: new Date(),
      },
    });

    if (needsAddress) {
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
