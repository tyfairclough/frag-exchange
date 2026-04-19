"use client";

import { CoralListingMode, ListingIntent } from "@/generated/prisma/enums";
import { InventoryColourMultiselect } from "@/components/inventory-colour-multiselect";
import {
  InventoryItemImageField,
  type InventoryItemImageFieldHandle,
} from "@/components/inventory-item-image-field";
import { CORAL_TYPES } from "@/lib/coral-options";
import type { ReactNode, RefObject } from "react";
import { ListingIntentFields } from "@/components/listing-intent-fields";

export type CoralInventoryFieldsProps = {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  imageUrl: string;
  /** When showing photo + AI, ref to read pending file and clear after client upload. */
  imageFieldRef?: RefObject<InventoryItemImageFieldHandle | null>;
  listingMode: CoralListingMode;
  setListingMode: (v: CoralListingMode) => void;
  listingIntent: ListingIntent;
  setListingIntent: (v: ListingIntent) => void;
  salePrice: string;
  setSalePrice: (v: string) => void;
  saleCurrency: string;
  setSaleCurrency: (v: string) => void;
  saleExternalUrl: string;
  setSaleExternalUrl: (v: string) => void;
  coralType: string;
  setCoralType: (v: string) => void;
  colours: string[];
  setColours: (v: string[]) => void;
  showImageUrlAndAiSuggest: boolean;
  /** My-items edit: bottom bar opens the same file picker via a global event. */
  openImagePickerFromGlobalEvent?: boolean;
  aiPending: boolean;
  onAiSuggest: () => void;
  aiHint: string | null;
  aiError: string | null;
  afterNameFields?: ReactNode;
};

export function CoralInventoryFields({
  name,
  setName,
  description,
  setDescription,
  imageUrl,
  imageFieldRef,
  listingMode,
  setListingMode,
  listingIntent,
  setListingIntent,
  salePrice,
  setSalePrice,
  saleCurrency,
  setSaleCurrency,
  saleExternalUrl,
  setSaleExternalUrl,
  coralType,
  setCoralType,
  colours,
  setColours,
  showImageUrlAndAiSuggest,
  openImagePickerFromGlobalEvent,
  aiPending,
  onAiSuggest,
  aiHint,
  aiError,
  afterNameFields,
}: CoralInventoryFieldsProps) {
  return (
    <>
      <label className="form-control w-full">
        <span className="label-text font-medium">Name</span>
        <input
          name="name"
          type="text"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input input-bordered w-full rounded-xl"
          placeholder="e.g. Green slimer acro frag"
        />
      </label>
      {afterNameFields}

      {showImageUrlAndAiSuggest ? (
        <div className="flex flex-col gap-3">
          <div className="form-control w-full">
            <span className="label-text font-medium">Photo</span>
            <InventoryItemImageField
              ref={imageFieldRef}
              committedImageUrl={imageUrl}
              openOnGlobalPickerEvent={openImagePickerFromGlobalEvent}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              className="btn btn-outline min-h-11 w-full shrink-0 rounded-xl sm:w-auto"
              disabled={aiPending || !name.trim()}
              onClick={onAiSuggest}
            >
              {aiPending ? <span className="loading loading-spinner loading-sm" /> : null}
              Suggest fields (AI)
            </button>
          </div>
        </div>
      ) : (
        <input type="hidden" name="imageUrl" value={imageUrl} readOnly />
      )}

      {showImageUrlAndAiSuggest && aiHint ? <p className="text-sm text-success">{aiHint}</p> : null}
      {showImageUrlAndAiSuggest && aiError ? <p className="text-sm text-error">{aiError}</p> : null}

      <label className="form-control w-full">
        <span className="label-text font-medium">Description</span>
        <textarea
          name="description"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="textarea textarea-bordered w-full rounded-xl"
          placeholder="Care notes, what you want in trade, frags available…"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="form-control w-full sm:col-span-2">
          <span className="label-text font-medium">Type</span>
          <select
            name="coralType"
            className="select select-bordered w-full rounded-xl"
            value={coralType}
            onChange={(e) => setCoralType(e.target.value)}
          >
            <option value="">Not specified</option>
            {CORAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <InventoryColourMultiselect label="Colours" selected={colours} onChange={setColours} />

      <label className="form-control w-full">
        <span className="label-text font-medium">How you prefer to swap</span>
        <select
          name="listingMode"
          className="select select-bordered w-full rounded-xl"
          value={listingMode}
          onChange={(e) => setListingMode(e.target.value as CoralListingMode)}
        >
          <option value={CoralListingMode.POST}>Post</option>
          <option value={CoralListingMode.MEET}>Meet in person</option>
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
    </>
  );
}
