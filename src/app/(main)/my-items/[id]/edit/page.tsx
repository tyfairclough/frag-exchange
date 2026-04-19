import Link from "next/link";
import { notFound } from "next/navigation";
import { CoralProfileStatus, InventoryKind } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { updateInventoryItemAction } from "@/app/(main)/my-items/actions";
import { coralColoursToFormValue, coralTypeToFormValue } from "@/lib/coral-options";
import {
  CoralKindEditForm,
  EquipmentKindEditForm,
  FishKindEditForm,
} from "@/components/inventory-edit-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditItemPage({
  params,
  searchParams,
}: Props & {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const item = await getPrisma().inventoryItem.findFirst({
    where: { id, userId: user.id },
  });

  if (!item) {
    notFound();
  }

  const boundUpdate = updateInventoryItemAction.bind(null, item.id);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/my-items" className="link link-hover text-base-content/70">
          My items
        </Link>
        <span className="text-base-content/40">/</span>
        <span className="font-medium text-base-content">Edit</span>
      </div>

      <h1 className="text-xl font-semibold text-base-content">Edit {item.name}</h1>

      {item.profileStatus === CoralProfileStatus.TRADED ? (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm">
          This item has been traded and can no longer be edited.
        </p>
      ) : null}

      {error === "name" ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">Please enter a name.</p>
      ) : null}
      {error === "locked" ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">This item is locked.</p>
      ) : null}
      {error === "equipment-fields" ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          Choose equipment type and condition.
        </p>
      ) : null}
      {error === "quantity" ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          Enter a valid quantity.
        </p>
      ) : null}
      {error === "sale-kind" ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          Gear items cannot be marked for sale.
        </p>
      ) : null}
      {error === "sale-price" ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          Enter a valid sale price.
        </p>
      ) : null}
      {error === "sale-currency" ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          Select a valid sale currency.
        </p>
      ) : null}
      {error === "sale-url" ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          Enter a valid external listing URL.
        </p>
      ) : null}
      {error === "listing-intent-locked" ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          For-sale items cannot switch back to swap/free and vice versa.
        </p>
      ) : null}
      {error === "image-too-large" ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          Photo is too large (max 6 MB). Choose a smaller image.
        </p>
      ) : null}
      {error === "image-type" ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          Use a JPEG, PNG, or WebP photo.
        </p>
      ) : null}
      {error === "invalid-image" ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          Could not process that photo. Try a different image.
        </p>
      ) : null}

      {item.profileStatus === CoralProfileStatus.UNLISTED ? (
        item.kind === InventoryKind.CORAL ? (
          <CoralKindEditForm
            saveAction={boundUpdate}
            defaults={{
              name: item.name,
              description: item.description,
              imageUrl: item.imageUrl ?? "",
              listingMode: item.listingMode,
              listingIntent: item.listingIntent,
              salePrice: item.salePriceMinor != null ? (item.salePriceMinor / 100).toFixed(2) : "",
              saleCurrency: item.saleCurrencyCode ?? "GBP",
              saleExternalUrl: item.saleExternalUrl ?? "",
              remainingQuantity: item.remainingQuantity,
              coralType: coralTypeToFormValue(item.coralType),
              colours: coralColoursToFormValue(item.colours),
            }}
          />
        ) : item.kind === InventoryKind.FISH ? (
          <FishKindEditForm
            saveAction={boundUpdate}
            defaults={{
              name: item.name,
              description: item.description,
              imageUrl: item.imageUrl ?? "",
              listingMode: item.listingMode,
              listingIntent: item.listingIntent,
              salePrice: item.salePriceMinor != null ? (item.salePriceMinor / 100).toFixed(2) : "",
              saleCurrency: item.saleCurrencyCode ?? "GBP",
              saleExternalUrl: item.saleExternalUrl ?? "",
              remainingQuantity: item.remainingQuantity,
              species: item.species ?? "",
              colours: coralColoursToFormValue(item.colours),
              reefSafe: item.reefSafe,
            }}
          />
        ) : item.equipmentCategory && item.equipmentCondition ? (
          <EquipmentKindEditForm
            saveAction={boundUpdate}
            defaults={{
              name: item.name,
              description: item.description,
              imageUrl: item.imageUrl ?? "",
              listingMode: item.listingMode,
              listingIntent: item.listingIntent,
              salePrice: item.salePriceMinor != null ? (item.salePriceMinor / 100).toFixed(2) : "",
              saleCurrency: item.saleCurrencyCode ?? "GBP",
              saleExternalUrl: item.saleExternalUrl ?? "",
              remainingQuantity: item.remainingQuantity,
              equipmentCategory: item.equipmentCategory,
              equipmentCondition: item.equipmentCondition,
            }}
          />
        ) : (
          <p className="text-sm text-error">Equipment item is missing category data — contact support.</p>
        )
      ) : null}
    </div>
  );
}
