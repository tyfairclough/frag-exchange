"use client";

import { CoralListingMode, ListingIntent } from "@/generated/prisma/enums";
import type { EquipmentCategory, EquipmentCondition } from "@/generated/prisma/enums";
import { CoralInventoryFields } from "@/components/coral-inventory-fields";
import { ItemQuantityFields } from "@/components/item-quantity-fields";
import { coralColoursToFormValue } from "@/lib/coral-options";
import { InventoryColourMultiselect } from "@/components/inventory-colour-multiselect";
import {
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_CATEGORY_VALUES,
  EQUIPMENT_CONDITION_LABELS,
  EQUIPMENT_CONDITION_VALUES,
} from "@/lib/equipment-options";
import { enrichCoralPreviewAction } from "@/app/(main)/my-items/actions";
import {
  InventoryItemImageField,
  type InventoryItemImageFieldHandle,
} from "@/components/inventory-item-image-field";
import { InventoryEditBottomNavBridge } from "@/components/inventory-edit-bottom-nav-context";
import {
  prepareInventoryImageForUpload,
  replaceFormDataImageFileWithNormalized,
} from "@/lib/prepare-inventory-vision-image-client";
import { useRef, useState, useTransition } from "react";
import { ListingIntentFields } from "@/components/listing-intent-fields";
import { usePostHog } from "posthog-js/react";

type SaveAction = (formData: FormData) => void | Promise<void>;

function messageForUploadError(code: string | undefined): string {
  switch (code) {
    case "image-too-large":
      return "Photo is too large (max 6 MB). Choose a smaller image.";
    case "invalid-image-type":
      return "Use a JPEG, PNG, or WebP photo.";
    case "invalid-image":
      return "Could not process that photo. Try a different image.";
    default:
      return "Could not upload the photo. Try again.";
  }
}

type SharedInventoryDefaults = {
  name: string;
  description: string;
  imageUrl: string;
  listingMode: CoralListingMode;
  listingIntent: ListingIntent;
  salePrice: string;
  saleCurrency: string;
  saleExternalUrl: string;
  remainingQuantity: number;
};

export function CoralKindEditForm({
  saveAction,
  defaults,
}: {
  saveAction: SaveAction;
  defaults: SharedInventoryDefaults & { coralType: string; colours: string[] };
}) {
  const posthog = usePostHog();
  const [name, setName] = useState(defaults.name);
  const [description, setDescription] = useState(defaults.description);
  const [imageUrl, setImageUrl] = useState(defaults.imageUrl);
  const [listingMode, setListingMode] = useState(defaults.listingMode);
  const [listingIntent, setListingIntent] = useState(defaults.listingIntent);
  const [salePrice, setSalePrice] = useState(defaults.salePrice);
  const [saleCurrency, setSaleCurrency] = useState(defaults.saleCurrency);
  const [saleExternalUrl, setSaleExternalUrl] = useState(defaults.saleExternalUrl);
  const [coralType, setCoralType] = useState(defaults.coralType);
  const [colours, setColours] = useState(defaults.colours);
  const [hasMultipleToExchange, setHasMultipleToExchange] = useState(defaults.remainingQuantity > 1);
  const [itemCount, setItemCount] = useState(String(Math.max(2, defaults.remainingQuantity)));
  const [aiPending, startAi] = useTransition();
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const imageFieldRef = useRef<InventoryItemImageFieldHandle>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const saleFieldsChanged =
        defaults.listingIntent === ListingIntent.FOR_SALE &&
        (salePrice !== defaults.salePrice ||
          saleCurrency !== defaults.saleCurrency ||
          saleExternalUrl !== defaults.saleExternalUrl);
      if (saleFieldsChanged) {
        posthog.capture("sale_listing_fields_edited", { kind: "coral" });
      }
      await replaceFormDataImageFileWithNormalized(fd);
      await saveAction(fd);
    } finally {
      setSubmitting(false);
    }
  }

  function onAiSuggest() {
    setAiError(null);
    setAiHint(null);
    startAi(async () => {
      let url = imageUrl.trim() || null;
      const pending = imageFieldRef.current?.getFile();
      if (pending) {
        const uploadFile = await prepareInventoryImageForUpload(pending);
        const up = new FormData();
        up.append("imageFile", uploadFile);
        const res = await fetch("/api/my-items/upload-image", {
          method: "POST",
          body: up,
          credentials: "include",
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setAiError(messageForUploadError(j.error));
          return;
        }
        const data = (await res.json()) as { imageUrl: string };
        setImageUrl(data.imageUrl);
        imageFieldRef.current?.clearStagedFile();
        url = data.imageUrl;
      }
      if (!url) {
        setAiError("Add a photo first, or choose an image with “Change image”.");
        return;
      }
      const r = await enrichCoralPreviewAction(name, url);
      setDescription(r.description);
      setAiHint("AI suggested description.");
    });
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} encType="multipart/form-data" className="flex flex-col gap-4">
      <InventoryEditBottomNavBridge />
      <CoralInventoryFields
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        imageUrl={imageUrl}
        listingMode={listingMode}
        setListingMode={setListingMode}
        listingIntent={listingIntent}
        setListingIntent={setListingIntent}
        salePrice={salePrice}
        setSalePrice={setSalePrice}
        saleCurrency={saleCurrency}
        setSaleCurrency={setSaleCurrency}
        saleExternalUrl={saleExternalUrl}
        setSaleExternalUrl={setSaleExternalUrl}
        coralType={coralType}
        setCoralType={setCoralType}
        colours={colours}
        setColours={setColours}
        showImageUrlAndAiSuggest
        openImagePickerFromGlobalEvent
        imageFieldRef={imageFieldRef}
        aiPending={aiPending}
        onAiSuggest={onAiSuggest}
        aiHint={aiHint}
        aiError={aiError}
        afterNameFields={
          <>
            <ItemQuantityFields
              hasMultiple={hasMultipleToExchange}
              setHasMultiple={setHasMultipleToExchange}
              quantity={itemCount}
              setQuantity={setItemCount}
            />
            <input
              type="hidden"
              name="quantity"
              value={hasMultipleToExchange ? itemCount : "1"}
              readOnly
            />
          </>
        }
      />
      <button type="submit" className="btn btn-primary min-h-11 rounded-xl" disabled={submitting}>
        Save
      </button>
    </form>
  );
}

export function FishKindEditForm({
  saveAction,
  defaults,
}: {
  saveAction: SaveAction;
  defaults: SharedInventoryDefaults & { species: string; colours: string[]; reefSafe: boolean | null };
}) {
  const posthog = usePostHog();
  const [species, setSpecies] = useState(defaults.species);
  const [colours, setColours] = useState(coralColoursToFormValue(defaults.colours));
  const [reefSafe, setReefSafe] = useState<string>(
    defaults.reefSafe === true ? "true" : defaults.reefSafe === false ? "false" : "",
  );
  const [hasMultipleToExchange, setHasMultipleToExchange] = useState(defaults.remainingQuantity > 1);
  const [itemCount, setItemCount] = useState(String(Math.max(2, defaults.remainingQuantity)));
  const [imageUrl] = useState(defaults.imageUrl);
  const [listingIntent, setListingIntent] = useState(defaults.listingIntent);
  const [salePrice, setSalePrice] = useState(defaults.salePrice);
  const [saleCurrency, setSaleCurrency] = useState(defaults.saleCurrency);
  const [saleExternalUrl, setSaleExternalUrl] = useState(defaults.saleExternalUrl);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const saleFieldsChanged =
        defaults.listingIntent === ListingIntent.FOR_SALE &&
        (salePrice !== defaults.salePrice ||
          saleCurrency !== defaults.saleCurrency ||
          saleExternalUrl !== defaults.saleExternalUrl);
      if (saleFieldsChanged) {
        posthog.capture("sale_listing_fields_edited", { kind: "fish" });
      }
      await replaceFormDataImageFileWithNormalized(fd);
      await saveAction(fd);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} encType="multipart/form-data" className="flex flex-col gap-4">
      <InventoryEditBottomNavBridge />
      <label className="form-control w-full">
        <span className="label-text font-medium">Name</span>
        <input
          name="name"
          required
          maxLength={120}
          defaultValue={defaults.name}
          className="input input-bordered w-full rounded-xl"
        />
      </label>
      <ItemQuantityFields
        hasMultiple={hasMultipleToExchange}
        setHasMultiple={setHasMultipleToExchange}
        quantity={itemCount}
        setQuantity={setItemCount}
      />
      <input type="hidden" name="quantity" value={hasMultipleToExchange ? itemCount : "1"} readOnly />
      <label className="form-control w-full">
        <span className="label-text font-medium">Description</span>
        <textarea
          name="description"
          rows={5}
          defaultValue={defaults.description}
          className="textarea textarea-bordered w-full rounded-xl"
        />
      </label>
      <div className="form-control w-full">
        <span className="label-text font-medium">Photo</span>
        <InventoryItemImageField committedImageUrl={imageUrl} openOnGlobalPickerEvent />
      </div>
      <label className="form-control w-full">
        <span className="label-text font-medium">Species</span>
        <input
          name="species"
          maxLength={200}
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
          className="input input-bordered w-full rounded-xl"
        />
      </label>
      <InventoryColourMultiselect label="Colours" selected={colours} onChange={setColours} />
      <label className="form-control w-full">
        <span className="label-text font-medium">Reef safe</span>
        <select
          name="reefSafe"
          className="select select-bordered w-full rounded-xl"
          value={reefSafe}
          onChange={(e) => setReefSafe(e.target.value)}
        >
          <option value="">Not specified</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>
      <label className="form-control w-full">
        <span className="label-text font-medium">How you prefer to swap</span>
        <select name="listingMode" defaultValue={defaults.listingMode} className="select select-bordered w-full rounded-xl">
          <option value={CoralListingMode.POST}>Post</option>
          <option value={CoralListingMode.MEET}>Meet</option>
          <option value={CoralListingMode.BOTH}>Post or meet</option>
        </select>
      </label>
      <ListingIntentFields
        value={listingIntent}
        onChange={setListingIntent}
        salePrice={salePrice}
        onSalePriceChange={setSalePrice}
        saleCurrency={saleCurrency}
        onSaleCurrencyChange={setSaleCurrency}
        saleExternalUrl={saleExternalUrl}
        onSaleExternalUrlChange={setSaleExternalUrl}
        allowForSale
      />
      <button type="submit" className="btn btn-primary min-h-11 rounded-xl" disabled={submitting}>
        Save
      </button>
    </form>
  );
}

export function EquipmentKindEditForm({
  saveAction,
  defaults,
}: {
  saveAction: SaveAction;
  defaults: SharedInventoryDefaults & {
    equipmentCategory: EquipmentCategory;
    equipmentCondition: EquipmentCondition;
  };
}) {
  const posthog = usePostHog();
  const [hasMultipleToExchange, setHasMultipleToExchange] = useState(defaults.remainingQuantity > 1);
  const [itemCount, setItemCount] = useState(String(Math.max(2, defaults.remainingQuantity)));
  const [imageUrl] = useState(defaults.imageUrl);
  const [listingIntent, setListingIntent] = useState(defaults.listingIntent);
  const [salePrice, setSalePrice] = useState(defaults.salePrice);
  const [saleCurrency, setSaleCurrency] = useState(defaults.saleCurrency);
  const [saleExternalUrl, setSaleExternalUrl] = useState(defaults.saleExternalUrl);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const saleFieldsChanged =
        defaults.listingIntent === ListingIntent.FOR_SALE &&
        (salePrice !== defaults.salePrice ||
          saleCurrency !== defaults.saleCurrency ||
          saleExternalUrl !== defaults.saleExternalUrl);
      if (saleFieldsChanged) {
        posthog.capture("sale_listing_fields_edited", { kind: "equipment" });
      }
      await replaceFormDataImageFileWithNormalized(fd);
      await saveAction(fd);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} encType="multipart/form-data" className="flex flex-col gap-4">
      <InventoryEditBottomNavBridge />
      <label className="form-control w-full">
        <span className="label-text font-medium">Name</span>
        <input
          name="name"
          required
          maxLength={120}
          defaultValue={defaults.name}
          className="input input-bordered w-full rounded-xl"
        />
      </label>
      <ItemQuantityFields
        hasMultiple={hasMultipleToExchange}
        setHasMultiple={setHasMultipleToExchange}
        quantity={itemCount}
        setQuantity={setItemCount}
      />
      <input type="hidden" name="quantity" value={hasMultipleToExchange ? itemCount : "1"} readOnly />
      <label className="form-control w-full">
        <span className="label-text font-medium">Description</span>
        <textarea
          name="description"
          rows={5}
          defaultValue={defaults.description}
          className="textarea textarea-bordered w-full rounded-xl"
        />
      </label>
      <div className="form-control w-full">
        <span className="label-text font-medium">Photo</span>
        <InventoryItemImageField committedImageUrl={imageUrl} openOnGlobalPickerEvent />
      </div>
      <label className="form-control w-full">
        <span className="label-text font-medium">Type</span>
        <select
          name="equipmentCategory"
          defaultValue={defaults.equipmentCategory}
          className="select select-bordered w-full rounded-xl"
          required
        >
          {EQUIPMENT_CATEGORY_VALUES.map((k) => (
            <option key={k} value={k}>
              {EQUIPMENT_CATEGORY_LABELS[k]}
            </option>
          ))}
        </select>
      </label>
      <label className="form-control w-full">
        <span className="label-text font-medium">Condition</span>
        <select
          name="equipmentCondition"
          defaultValue={defaults.equipmentCondition}
          className="select select-bordered w-full rounded-xl"
          required
        >
          {EQUIPMENT_CONDITION_VALUES.map((k) => (
            <option key={k} value={k}>
              {EQUIPMENT_CONDITION_LABELS[k]}
            </option>
          ))}
        </select>
      </label>
      <label className="form-control w-full">
        <span className="label-text font-medium">How you prefer to swap</span>
        <select name="listingMode" defaultValue={defaults.listingMode} className="select select-bordered w-full rounded-xl">
          <option value={CoralListingMode.POST}>Post</option>
          <option value={CoralListingMode.MEET}>Meet</option>
          <option value={CoralListingMode.BOTH}>Post or meet</option>
        </select>
      </label>
      <ListingIntentFields
        value={listingIntent}
        onChange={setListingIntent}
        salePrice={salePrice}
        onSalePriceChange={setSalePrice}
        saleCurrency={saleCurrency}
        onSaleCurrencyChange={setSaleCurrency}
        saleExternalUrl={saleExternalUrl}
        onSaleExternalUrlChange={setSaleExternalUrl}
        allowForSale={false}
      />
      <button type="submit" className="btn btn-primary min-h-11 rounded-xl" disabled={submitting}>
        Save
      </button>
    </form>
  );
}
