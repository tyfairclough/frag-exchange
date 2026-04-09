"use client";

import { CoralListingMode } from "@/generated/prisma/enums";
import { CORAL_COLOURS, CORAL_TYPES, isActiveCoralColour } from "@/lib/coral-options";
import type { ReactNode } from "react";

export type CoralInventoryFieldsProps = {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  imageUrl: string;
  setImageUrl: (v: string) => void;
  listingMode: CoralListingMode;
  setListingMode: (v: CoralListingMode) => void;
  freeToGoodHome: boolean;
  setFreeToGoodHome: (v: boolean) => void;
  coralType: string;
  setCoralType: (v: string) => void;
  colour: string;
  setColour: (v: string) => void;
  showImageUrlAndAiSuggest: boolean;
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
  setImageUrl,
  listingMode,
  setListingMode,
  freeToGoodHome,
  setFreeToGoodHome,
  coralType,
  setCoralType,
  colour,
  setColour,
  showImageUrlAndAiSuggest,
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="form-control w-full flex-1">
            <span className="label-text font-medium">Image URL (optional)</span>
            <input
              name="imageUrl"
              type="url"
              maxLength={2048}
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="input input-bordered w-full rounded-xl"
              placeholder="https://… (add later is fine)"
            />
          </label>
          <button
            type="button"
            className="btn btn-outline min-h-11 shrink-0 rounded-xl"
            disabled={aiPending || !name.trim()}
            onClick={onAiSuggest}
          >
            {aiPending ? <span className="loading loading-spinner loading-sm" /> : null}
            Suggest fields (AI)
          </button>
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
        <label className="form-control w-full">
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
        <label className="form-control w-full">
          <span className="label-text font-medium">Colour</span>
          <select
            name="colour"
            className="select select-bordered w-full rounded-xl"
            value={colour}
            onChange={(e) => setColour(e.target.value)}
          >
            <option value="">Not specified</option>
            {CORAL_COLOURS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {colour.trim() && !isActiveCoralColour(colour) ? (
              <option value={colour}>{colour} (deprecated)</option>
            ) : null}
          </select>
        </label>
      </div>

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

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-base-content/10 bg-base-200/40 p-4">
        <input
          name="freeToGoodHome"
          type="checkbox"
          className="checkbox checkbox-primary mt-0.5"
          checked={freeToGoodHome}
          onChange={(e) => setFreeToGoodHome(e.target.checked)}
        />
        <span>
          <span className="font-medium">Free to good home</span>
          <span className="mt-0.5 block text-sm text-base-content/70">
            This coral is available at no cost to another hobbyist.
          </span>
        </span>
      </label>
    </>
  );
}
