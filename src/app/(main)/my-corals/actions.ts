"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CoralListingMode, CoralProfileStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { enrichCoralFields } from "@/lib/coral-ai";
import { parseCoralColourFromForm, parseCoralTypeFromForm } from "@/lib/coral-options";

function str(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseListingMode(raw: string): CoralListingMode {
  if (raw === CoralListingMode.POST) {
    return CoralListingMode.POST;
  }
  if (raw === CoralListingMode.MEET) {
    return CoralListingMode.MEET;
  }
  return CoralListingMode.BOTH;
}

export async function enrichCoralPreviewAction(name: string, imageUrl?: string | null) {
  await requireUser();
  return enrichCoralFields({ name, imageUrl: imageUrl ?? null });
}

export async function createCoralAction(formData: FormData) {
  const user = await requireUser();

  const name = str(formData.get("name"));
  const description = str(formData.get("description"));
  const imageUrlRaw = str(formData.get("imageUrl"));
  const imageUrl = imageUrlRaw || null;
  const listingMode = parseListingMode(str(formData.get("listingMode")));
  const freeToGoodHome = formData.get("freeToGoodHome") === "on";
  const coralType = parseCoralTypeFromForm(str(formData.get("coralType")));
  const colour = parseCoralColourFromForm(str(formData.get("colour")));

  if (!name) {
    redirect("/my-corals/new?error=name");
  }

  await getPrisma().coral.create({
    data: {
      userId: user.id,
      name,
      description,
      imageUrl,
      listingMode,
      freeToGoodHome,
      coralType,
      colour,
    },
  });

  revalidatePath("/my-corals");
  redirect("/my-corals");
}

export async function updateCoralAction(coralId: string, formData: FormData) {
  const user = await requireUser();

  const existing = await getPrisma().coral.findFirst({
    where: { id: coralId, userId: user.id },
  });

  if (!existing) {
    redirect("/my-corals?error=not-found");
  }
  if (existing.profileStatus !== CoralProfileStatus.UNLISTED) {
    redirect(`/my-corals/${coralId}/edit?error=locked`);
  }

  const name = str(formData.get("name"));
  const description = str(formData.get("description"));
  const imageUrlRaw = str(formData.get("imageUrl"));
  const imageUrl = imageUrlRaw || null;
  const listingMode = parseListingMode(str(formData.get("listingMode")));
  const freeToGoodHome = formData.get("freeToGoodHome") === "on";
  const coralType = parseCoralTypeFromForm(str(formData.get("coralType")));
  const colour = parseCoralColourFromForm(str(formData.get("colour")));

  if (!name) {
    redirect(`/my-corals/${coralId}/edit?error=name`);
  }

  await getPrisma().coral.update({
    where: { id: coralId },
    data: {
      name,
      description,
      imageUrl,
      listingMode,
      freeToGoodHome,
      coralType,
      colour,
    },
  });

  revalidatePath("/my-corals");
  redirect("/my-corals");
}

export async function deleteCoralAction(coralId: string) {
  const user = await requireUser();

  const existing = await getPrisma().coral.findFirst({
    where: { id: coralId, userId: user.id },
  });

  if (!existing) {
    redirect("/my-corals?error=not-found");
  }
  if (existing.profileStatus !== CoralProfileStatus.UNLISTED) {
    redirect("/my-corals?error=locked");
  }

  await getPrisma().coral.delete({ where: { id: coralId } });

  revalidatePath("/my-corals");
  redirect("/my-corals");
}
