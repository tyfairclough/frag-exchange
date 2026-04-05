"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { refreshTownCenterForUserAddress } from "@/lib/town-geocode";

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
