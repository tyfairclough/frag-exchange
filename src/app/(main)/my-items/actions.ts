"use server";

import { Buffer } from "node:buffer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CoralListingMode,
  CoralProfileStatus,
  InventoryKind,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { enrichCoralFields } from "@/lib/coral-ai";
import {
  CORAL_UPLOAD_MAX_BYTES,
  saveCoralImageToPublic,
  validateImageMime,
} from "@/lib/coral-upload";
import { parseCoralColourFromForm, parseCoralTypeFromForm } from "@/lib/coral-options";
import {
  parseEquipmentCategoryFromForm,
  parseEquipmentConditionFromForm,
} from "@/lib/equipment-options";
import { parseInventoryKind } from "@/lib/inventory-kind";

const MY_ITEMS = "/my-items";

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

export async function createInventoryItemAction(formData: FormData) {
  const user = await requireUser();

  const kind = parseInventoryKind(str(formData.get("kind")));
  if (!kind) {
    redirect(`${MY_ITEMS}/new?error=kind`);
  }

  const name = str(formData.get("name"));
  const description = str(formData.get("description"));
  const imageUrlRaw = str(formData.get("imageUrl"));
  let imageUrl: string | null = imageUrlRaw || null;
  const listingMode = parseListingMode(str(formData.get("listingMode")));
  const freeToGoodHome = formData.get("freeToGoodHome") === "on";

  const imageFile = formData.get("imageFile");
  if (imageFile && typeof imageFile === "object" && "arrayBuffer" in imageFile && "size" in imageFile) {
    const file = imageFile as File;
    if (file.size > 0) {
      if (file.size > CORAL_UPLOAD_MAX_BYTES) {
        redirect(`${MY_ITEMS}/new?error=image-too-large`);
      }
      const mime = (file.type || "").trim().toLowerCase();
      if (!validateImageMime(mime)) {
        redirect(`${MY_ITEMS}/new?error=image-type`);
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      imageUrl = await saveCoralImageToPublic({
        userId: user.id,
        buffer,
        mimeType: mime,
      });
    }
  }

  if (!imageUrl) {
    redirect(`${MY_ITEMS}/new?error=image-required`);
  }

  if (!name) {
    redirect(`${MY_ITEMS}/new?error=name`);
  }

  const base = {
    userId: user.id,
    kind,
    name,
    description,
    imageUrl,
    listingMode,
    freeToGoodHome,
  };

  if (kind === InventoryKind.CORAL) {
    const coralType = parseCoralTypeFromForm(str(formData.get("coralType")));
    const colour = parseCoralColourFromForm(str(formData.get("colour")));
    await getPrisma().inventoryItem.create({
      data: {
        ...base,
        coralType,
        colour,
        species: null,
        reefSafe: null,
        equipmentCategory: null,
        equipmentCondition: null,
      },
    });
  } else if (kind === InventoryKind.FISH) {
    const colour = parseCoralColourFromForm(str(formData.get("colour")));
    const species = str(formData.get("species")).slice(0, 200) || null;
    const reefRaw = str(formData.get("reefSafe"));
    const reefSafe =
      reefRaw === "true" ? true : reefRaw === "false" ? false : null;
    await getPrisma().inventoryItem.create({
      data: {
        ...base,
        coralType: null,
        colour,
        species,
        reefSafe,
        equipmentCategory: null,
        equipmentCondition: null,
      },
    });
  } else {
    const equipmentCategory = parseEquipmentCategoryFromForm(str(formData.get("equipmentCategory")));
    const equipmentCondition = parseEquipmentConditionFromForm(str(formData.get("equipmentCondition")));
    if (!equipmentCategory || !equipmentCondition) {
      redirect(`${MY_ITEMS}/new?error=equipment-fields`);
    }
    await getPrisma().inventoryItem.create({
      data: {
        ...base,
        coralType: null,
        colour: null,
        species: null,
        reefSafe: null,
        equipmentCategory,
        equipmentCondition,
      },
    });
  }

  revalidatePath(MY_ITEMS);
  redirect(MY_ITEMS);
}

/** @deprecated use createInventoryItemAction — kept for transitional imports */
export async function createCoralAction(formData: FormData) {
  const fd = new FormData();
  for (const [k, v] of formData.entries()) {
    fd.append(k, v);
  }
  fd.set("kind", InventoryKind.CORAL);
  return createInventoryItemAction(fd);
}

export async function updateInventoryItemAction(itemId: string, formData: FormData) {
  const user = await requireUser();

  const existing = await getPrisma().inventoryItem.findFirst({
    where: { id: itemId, userId: user.id },
  });

  if (!existing) {
    redirect(`${MY_ITEMS}?error=not-found`);
  }
  if (existing.profileStatus !== CoralProfileStatus.UNLISTED) {
    redirect(`${MY_ITEMS}/${itemId}/edit?error=locked`);
  }

  const name = str(formData.get("name"));
  const description = str(formData.get("description"));
  const imageUrlRaw = str(formData.get("imageUrl"));
  const imageUrl = imageUrlRaw || null;
  const listingMode = parseListingMode(str(formData.get("listingMode")));
  const freeToGoodHome = formData.get("freeToGoodHome") === "on";

  if (!name) {
    redirect(`${MY_ITEMS}/${itemId}/edit?error=name`);
  }

  const kind = existing.kind;

  if (kind === InventoryKind.CORAL) {
    const coralType = parseCoralTypeFromForm(str(formData.get("coralType")));
    const colour = parseCoralColourFromForm(str(formData.get("colour")));
    await getPrisma().inventoryItem.update({
      where: { id: itemId },
      data: {
        name,
        description,
        imageUrl,
        listingMode,
        freeToGoodHome,
        coralType,
        colour,
        species: null,
        reefSafe: null,
        equipmentCategory: null,
        equipmentCondition: null,
      },
    });
  } else if (kind === InventoryKind.FISH) {
    const colour = parseCoralColourFromForm(str(formData.get("colour")));
    const species = str(formData.get("species")).slice(0, 200) || null;
    const reefRaw = str(formData.get("reefSafe"));
    const reefSafe =
      reefRaw === "true" ? true : reefRaw === "false" ? false : null;
    await getPrisma().inventoryItem.update({
      where: { id: itemId },
      data: {
        name,
        description,
        imageUrl,
        listingMode,
        freeToGoodHome,
        coralType: null,
        colour,
        species,
        reefSafe,
        equipmentCategory: null,
        equipmentCondition: null,
      },
    });
  } else {
    const equipmentCategory = parseEquipmentCategoryFromForm(str(formData.get("equipmentCategory")));
    const equipmentCondition = parseEquipmentConditionFromForm(str(formData.get("equipmentCondition")));
    if (!equipmentCategory || !equipmentCondition) {
      redirect(`${MY_ITEMS}/${itemId}/edit?error=equipment-fields`);
    }
    await getPrisma().inventoryItem.update({
      where: { id: itemId },
      data: {
        name,
        description,
        imageUrl,
        listingMode,
        freeToGoodHome,
        coralType: null,
        colour: null,
        species: null,
        reefSafe: null,
        equipmentCategory,
        equipmentCondition,
      },
    });
  }

  revalidatePath(MY_ITEMS);
  redirect(MY_ITEMS);
}

export async function updateCoralAction(itemId: string, formData: FormData) {
  return updateInventoryItemAction(itemId, formData);
}

export async function deleteInventoryItemAction(itemId: string) {
  const user = await requireUser();

  const existing = await getPrisma().inventoryItem.findFirst({
    where: { id: itemId, userId: user.id },
  });

  if (!existing) {
    redirect(`${MY_ITEMS}?error=not-found`);
  }
  if (existing.profileStatus !== CoralProfileStatus.UNLISTED) {
    redirect(`${MY_ITEMS}?error=locked`);
  }

  await getPrisma().inventoryItem.delete({ where: { id: itemId } });

  revalidatePath(MY_ITEMS);
  redirect(MY_ITEMS);
}

export async function deleteCoralAction(itemId: string) {
  return deleteInventoryItemAction(itemId);
}
