"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CoralProfileStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { listingExpiresAtFrom } from "@/lib/listing-duration";
import { getGroupAddressGate } from "@/lib/group-address-gate";

function str(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function requireMember(exchangeId: string, userId: string) {
  return getPrisma().exchangeMembership.findFirst({
    where: { exchangeId, userId },
  });
}

export async function addExchangeListingFormAction(formData: FormData) {
  const user = await requireUser();
  const exchangeId = str(formData.get("exchangeId"));
  const inventoryItemId =
    str(formData.get("inventoryItemId")) || str(formData.get("coralId"));
  if (!exchangeId || !inventoryItemId) {
    redirect("/exchanges?error=listing-invalid");
  }

  const member = await requireMember(exchangeId, user.id);
  if (!member) {
    redirect(`/exchanges/${exchangeId}?error=listing-forbidden`);
  }
  const addressGate = await getGroupAddressGate(exchangeId, user.id, `/exchanges/${exchangeId}`);
  if (addressGate.blocked) {
    redirect(addressGate.redirectPath ?? `/exchanges/${exchangeId}?error=address-required-group`);
  }

  const item = await getPrisma().inventoryItem.findFirst({
    where: { id: inventoryItemId, userId: user.id },
  });
  if (!item || item.profileStatus !== CoralProfileStatus.UNLISTED) {
    redirect(`/exchanges/${exchangeId}?error=listing-coral`);
  }

  const now = new Date();
  const expiresAt = listingExpiresAtFrom(now);

  await getPrisma().exchangeListing.upsert({
    where: {
      exchangeId_inventoryItemId: { exchangeId, inventoryItemId },
    },
    create: {
      exchangeId,
      inventoryItemId,
      listedAt: now,
      expiresAt,
    },
    update: {
      listedAt: now,
      expiresAt,
    },
  });

  revalidatePath(`/exchanges/${exchangeId}`);
  revalidatePath(`/exchanges/${exchangeId}/trade`);
  revalidatePath(`/exchanges/${exchangeId}/trades`);
  revalidatePath("/explore");
  redirect(`/exchanges/${exchangeId}?listed=1`);
}

export async function removeExchangeListingFormAction(formData: FormData) {
  const user = await requireUser();
  const exchangeId = str(formData.get("exchangeId"));
  const inventoryItemId =
    str(formData.get("inventoryItemId")) || str(formData.get("coralId"));
  if (!exchangeId || !inventoryItemId) {
    redirect("/exchanges?error=listing-invalid");
  }

  const item = await getPrisma().inventoryItem.findFirst({
    where: { id: inventoryItemId, userId: user.id },
  });
  if (!item) {
    redirect(`/exchanges/${exchangeId}?error=listing-coral`);
  }
  const addressGate = await getGroupAddressGate(exchangeId, user.id, `/exchanges/${exchangeId}`);
  if (addressGate.blocked) {
    redirect(addressGate.redirectPath ?? `/exchanges/${exchangeId}?error=address-required-group`);
  }

  await getPrisma().exchangeListing.deleteMany({
    where: { exchangeId, inventoryItemId },
  });

  revalidatePath(`/exchanges/${exchangeId}`);
  revalidatePath(`/exchanges/${exchangeId}/trade`);
  revalidatePath(`/exchanges/${exchangeId}/trades`);
  revalidatePath("/explore");
  redirect(`/exchanges/${exchangeId}?unlisted=1`);
}
