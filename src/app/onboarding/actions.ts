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
import { LEGAL_VERSION } from "@/lib/legal-version";
import {
  buildAliasCandidateFromWordList,
  clampAliasFromClient,
  fetchAliasWordStrings,
  MAX_USER_ALIAS_LENGTH,
  MIN_ALIAS_GENERATOR_WORDS,
  otherUserHasAlias,
  pickUniqueAliasCandidate,
} from "@/lib/suggested-alias";
import { saveUserAvatarToPublic, validateAvatarUpload } from "@/lib/avatar-image-upload";

function str(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function completeOnboardingAction(formData: FormData) {
  const user = await requireUser();

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

  const explicitAlias = clampAliasFromClient(str(formData.get("alias")));
  const suggestedAlias = clampAliasFromClient(str(formData.get("suggestedAlias")));
  const avatarEmoji = str(formData.get("avatarEmoji"));
  const avatarModeRaw = str(formData.get("avatarMode"));
  const avatarMode = avatarModeRaw === "image" ? "image" : "emoji";
  const avatarFileRaw = formData.get("avatarFile");
  const avatarFile = avatarFileRaw instanceof File ? avatarFileRaw : null;
  const tos = formData.get("tosAccepted") === "on";
  const privacy = formData.get("privacyAccepted") === "on";
  if (!tos) {
    redirect("/onboarding?error=tos");
  }
  if (!privacy) {
    redirect("/onboarding?error=privacy");
  }

  const prisma = getPrisma();
  const words = await fetchAliasWordStrings(prisma);

  if (explicitAlias.length > MAX_USER_ALIAS_LENGTH) {
    redirect("/onboarding?error=alias-length");
  }

  if (words.length < MIN_ALIAS_GENERATOR_WORDS && !explicitAlias) {
    redirect("/onboarding?error=alias-words");
  }

  let resolvedAlias: string;
  if (explicitAlias) {
    resolvedAlias = explicitAlias;
    if (await otherUserHasAlias(prisma, resolvedAlias, user.id)) {
      redirect("/onboarding?error=alias-taken");
    }
  } else {
    let candidate = suggestedAlias;
    if (!candidate) {
      candidate = (await pickUniqueAliasCandidate(prisma, user.id, words)) ?? "";
    }
    if (!candidate) {
      redirect("/onboarding?error=alias-words");
    }
    resolvedAlias = candidate;
    let guard = 0;
    while ((await otherUserHasAlias(prisma, resolvedAlias, user.id)) && guard < 30) {
      resolvedAlias = buildAliasCandidateFromWordList(words);
      guard += 1;
    }
    if (await otherUserHasAlias(prisma, resolvedAlias, user.id)) {
      redirect("/onboarding?error=alias-words");
    }
  }

  const now = new Date();
  let uploadedAvatar:
    | {
        avatar40Url: string;
        avatar80Url: string;
        avatar256Url: string;
        avatarUpdatedAt: Date;
      }
    | null = null;

  if (avatarMode === "image" && (!avatarFile || avatarFile.size <= 0)) {
    redirect(`/onboarding?error=${encodeURIComponent("avatar-upload")}`);
  }

  if (avatarMode === "image" && avatarFile && avatarFile.size > 0) {
    const error = validateAvatarUpload(avatarFile);
    if (error) {
      redirect(`/onboarding?error=${encodeURIComponent("avatar-upload")}`);
    }
    const arrayBuffer = await avatarFile.arrayBuffer();
    uploadedAvatar = await saveUserAvatarToPublic({
      userId: user.id,
      buffer: Buffer.from(arrayBuffer),
      mimeType: avatarFile.type || "image/webp",
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        alias: resolvedAlias,
        avatarEmoji: avatarMode === "emoji" ? avatarEmoji || null : null,
        avatar40Url: avatarMode === "image" ? uploadedAvatar?.avatar40Url ?? undefined : null,
        avatar80Url: avatarMode === "image" ? uploadedAvatar?.avatar80Url ?? undefined : null,
        avatar256Url: avatarMode === "image" ? uploadedAvatar?.avatar256Url ?? undefined : null,
        avatarUpdatedAt: avatarMode === "image" ? uploadedAvatar?.avatarUpdatedAt ?? undefined : null,
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

  const rawNext = await consumeOnboardingNextCookie();
  const destination = rawNext ?? "/";
  const autoJoin = await autoJoinOnboardingDestination(user.id, destination);
  if (autoJoin.joined && autoJoin.exchangeId) {
    revalidatePath("/exchanges");
    revalidatePath("/exchanges/browse");
    revalidatePath(`/exchanges/${autoJoin.exchangeId}`);
    revalidatePath(`/exchanges/${autoJoin.exchangeId}/listings`);
    redirect(autoJoin.destination);
  }
  if (!autoJoin.joined && autoJoin.destination !== destination) {
    redirect(autoJoin.destination);
  }

  const inviteMatch = destination.match(/^\/exchanges\/invite\/([^/?#]+)$/);
  if (inviteMatch) {
    const rawToken = inviteMatch[1] ?? "";
    let token = rawToken;
    try {
      token = decodeURIComponent(rawToken);
    } catch {
      token = rawToken;
    }
    redirect(`/exchanges?welcome=1&inviteToken=${encodeURIComponent(token)}`);
  }

  if (!rawNext || destination === "/" || destination === "/exchanges") {
    redirect("/exchanges?welcome=1");
  }

  redirect(destination);
}
