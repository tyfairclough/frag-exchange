"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { CoralProfileStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { listingExpiresAtFrom } from "@/lib/listing-duration";
import { getGroupAddressGate } from "@/lib/group-address-gate";
import { MARKETING_LISTINGS_CACHE_TAG } from "@/lib/marketing-listings";
import { cancelPendingTradesForItemOnListingRemoval } from "@/lib/trade-cancel-for-listing";
import { getRequestOrigin } from "@/lib/request-origin";
import { consumeRateLimitToken } from "@/lib/rate-limit";
import { isKindAllowedOnExchange } from "@/lib/listing-eligibility";

function str(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function requireMember(exchangeId: string, userId: string) {
  return getPrisma().exchangeMembership.findFirst({
    where: { exchangeId, userId },
  });
}

export type ListingActionError =
  | "invalid"
  | "forbidden"
  | "address"
  | "item"
  | "kind"
  | "rate_limit"
  | "missing";

function revalidateListingMutation(exchangeId: string) {
  revalidatePath(`/exchanges/${exchangeId}`);
  revalidatePath(`/exchanges/${exchangeId}/listings`);
  revalidatePath(`/exchanges/${exchangeId}/trade`);
  revalidatePath(`/exchanges/${exchangeId}/trades`);
  revalidatePath("/explore");
  revalidateTag(MARKETING_LISTINGS_CACHE_TAG, "max");
}

async function addExchangeListingCore(
  userId: string,
  exchangeId: string,
  inventoryItemId: string,
): Promise<{ ok: true } | { ok: false; error: Exclude<ListingActionError, "rate_limit" | "missing"> }> {
  if (!exchangeId || !inventoryItemId) {
    return { ok: false, error: "invalid" };
  }

  const member = await requireMember(exchangeId, userId);
  if (!member) {
    return { ok: false, error: "forbidden" };
  }
  const addressGate = await getGroupAddressGate(exchangeId, userId, `/exchanges/${exchangeId}/listings`);
  if (addressGate.blocked) {
    return { ok: false, error: "address" };
  }

  const [item, exchange] = await Promise.all([
    getPrisma().inventoryItem.findFirst({
      where: { id: inventoryItemId, userId },
    }),
    getPrisma().exchange.findUnique({
      where: { id: exchangeId },
      select: { allowCoral: true, allowFish: true, allowEquipment: true },
    }),
  ]);
  if (!item || item.profileStatus !== CoralProfileStatus.UNLISTED || item.remainingQuantity <= 0) {
    return { ok: false, error: "item" };
  }
  if (!exchange || !isKindAllowedOnExchange(item.kind, exchange)) {
    return { ok: false, error: "kind" };
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

  return { ok: true };
}

export async function addExchangeListingForItemAction(params: {
  inventoryItemId: string;
  exchangeId: string;
}): Promise<{ ok: true } | { ok: false; error: ListingActionError }> {
  const user = await requireUser();
  const r = await addExchangeListingCore(user.id, params.exchangeId.trim(), params.inventoryItemId.trim());
  if (!r.ok) {
    return r;
  }
  revalidateListingMutation(params.exchangeId.trim());
  revalidatePath("/my-items");
  return { ok: true };
}

export async function addExchangeListingFormAction(formData: FormData) {
  const user = await requireUser();
  const exchangeId = str(formData.get("exchangeId"));
  const inventoryItemId =
    str(formData.get("inventoryItemId")) || str(formData.get("coralId"));

  const r = await addExchangeListingCore(user.id, exchangeId, inventoryItemId);
  if (!r.ok) {
    switch (r.error) {
      case "invalid":
        redirect("/exchanges?error=listing-invalid");
      case "forbidden":
        redirect(`/exchanges/${exchangeId}/listings?error=listing-forbidden`);
      case "address": {
        const gate = await getGroupAddressGate(exchangeId, user.id, `/exchanges/${exchangeId}/listings`);
        redirect(gate.redirectPath ?? `/exchanges/${exchangeId}/listings?error=address-required-group`);
      }
      case "item":
        redirect(`/exchanges/${exchangeId}/listings?error=listing-coral`);
      case "kind":
        redirect(`/exchanges/${exchangeId}/listings?error=listing-kind`);
      default:
        redirect("/exchanges?error=listing-invalid");
    }
  }

  revalidateListingMutation(exchangeId);
  revalidatePath("/my-items");
  redirect(`/exchanges/${exchangeId}/listings?listed=1&item=${encodeURIComponent(inventoryItemId)}`);
}

async function removeExchangeListingCore(
  userId: string,
  exchangeId: string,
  inventoryItemId: string,
): Promise<{ ok: true } | { ok: false; error: ListingActionError }> {
  if (!exchangeId || !inventoryItemId) {
    return { ok: false, error: "invalid" };
  }

  const item = await getPrisma().inventoryItem.findFirst({
    where: { id: inventoryItemId, userId },
  });
  if (!item) {
    return { ok: false, error: "item" };
  }
  const addressGate = await getGroupAddressGate(exchangeId, userId, `/exchanges/${exchangeId}/listings`);
  if (addressGate.blocked) {
    return { ok: false, error: "address" };
  }

  const db = getPrisma();
  const now = new Date();
  const baseUrl = await getRequestOrigin();
  await cancelPendingTradesForItemOnListingRemoval(db, {
    baseUrl,
    now,
    exchangeId,
    inventoryItemId,
    actorUserId: userId,
  });

  await db.exchangeListing.deleteMany({
    where: { exchangeId, inventoryItemId },
  });

  return { ok: true };
}

export async function removeExchangeListingsForItemAction(params: {
  inventoryItemId: string;
  exchangeIds: string[];
}): Promise<{ ok: true } | { ok: false; error: ListingActionError }> {
  const user = await requireUser();
  const inventoryItemId = params.inventoryItemId.trim();
  const exchangeIds = [...new Set(params.exchangeIds.map((id) => id.trim()).filter(Boolean))];
  if (!inventoryItemId || exchangeIds.length === 0) {
    return { ok: false, error: "invalid" };
  }

  if (!consumeRateLimitToken(`trade:mut:${user.id}`, 48, 10 * 60 * 1000)) {
    return { ok: false, error: "rate_limit" };
  }

  for (const exchangeId of exchangeIds) {
    const r = await removeExchangeListingCore(user.id, exchangeId, inventoryItemId);
    if (!r.ok) {
      return r;
    }
    revalidateListingMutation(exchangeId);
  }
  revalidatePath("/my-items");
  return { ok: true };
}

export async function removeExchangeListingFormAction(formData: FormData) {
  const user = await requireUser();
  const exchangeId = str(formData.get("exchangeId"));
  const inventoryItemId =
    str(formData.get("inventoryItemId")) || str(formData.get("coralId"));
  if (!exchangeId || !inventoryItemId) {
    redirect("/exchanges?error=listing-invalid");
  }

  if (!consumeRateLimitToken(`trade:mut:${user.id}`, 48, 10 * 60 * 1000)) {
    redirect("/exchanges?error=trade-rate-limit");
  }

  const r = await removeExchangeListingCore(user.id, exchangeId, inventoryItemId);
  if (!r.ok) {
    switch (r.error) {
      case "item":
        redirect(`/exchanges/${exchangeId}/listings?error=listing-coral`);
      case "address": {
        const gate = await getGroupAddressGate(exchangeId, user.id, `/exchanges/${exchangeId}/listings`);
        redirect(gate.redirectPath ?? `/exchanges/${exchangeId}/listings?error=address-required-group`);
      }
      case "rate_limit":
        redirect("/exchanges?error=trade-rate-limit");
      default:
        redirect("/exchanges?error=listing-invalid");
    }
  }

  revalidateListingMutation(exchangeId);
  revalidatePath("/my-items");
  redirect(`/exchanges/${exchangeId}/listings?unlisted=1`);
}
