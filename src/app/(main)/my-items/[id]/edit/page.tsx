import Link from "next/link";
import { notFound } from "next/navigation";
import { CoralProfileStatus, InventoryKind } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { updateInventoryItemAction } from "@/app/(main)/my-items/actions";
import { coralColourToFormValue, coralTypeToFormValue } from "@/lib/coral-options";
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

      {item.profileStatus === CoralProfileStatus.UNLISTED ? (
        item.kind === InventoryKind.CORAL ? (
          <CoralKindEditForm
            saveAction={boundUpdate}
            defaults={{
              name: item.name,
              description: item.description,
              imageUrl: item.imageUrl ?? "",
              listingMode: item.listingMode,
              freeToGoodHome: item.freeToGoodHome,
              remainingQuantity: item.remainingQuantity,
              coralType: coralTypeToFormValue(item.coralType),
              colour: coralColourToFormValue(item.colour),
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
              freeToGoodHome: item.freeToGoodHome,
              remainingQuantity: item.remainingQuantity,
              species: item.species ?? "",
              colour: coralColourToFormValue(item.colour),
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
              freeToGoodHome: item.freeToGoodHome,
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
