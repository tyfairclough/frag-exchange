"use client";

import { CoralListingMode } from "@/generated/prisma/enums";
import type { EquipmentCategory, EquipmentCondition } from "@/generated/prisma/enums";
import { CoralInventoryFields } from "@/components/coral-inventory-fields";
import { CORAL_COLOURS, CORAL_TYPES, isActiveCoralColour } from "@/lib/coral-options";
import {
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_CATEGORY_VALUES,
  EQUIPMENT_CONDITION_LABELS,
  EQUIPMENT_CONDITION_VALUES,
} from "@/lib/equipment-options";
import { enrichCoralPreviewAction } from "@/app/(main)/my-items/actions";
import { useState, useTransition } from "react";

type SaveAction = (formData: FormData) => void | Promise<void>;

type SharedInventoryDefaults = {
  name: string;
  description: string;
  imageUrl: string;
  listingMode: CoralListingMode;
  freeToGoodHome: boolean;
};

export function CoralKindEditForm({
  saveAction,
  defaults,
}: {
  saveAction: SaveAction;
  defaults: SharedInventoryDefaults & { coralType: string; colour: string };
}) {
  const [name, setName] = useState(defaults.name);
  const [description, setDescription] = useState(defaults.description);
  const [imageUrl, setImageUrl] = useState(defaults.imageUrl);
  const [listingMode, setListingMode] = useState(defaults.listingMode);
  const [freeToGoodHome, setFreeToGoodHome] = useState(defaults.freeToGoodHome);
  const [coralType, setCoralType] = useState(defaults.coralType);
  const [colour, setColour] = useState(defaults.colour);
  const [aiPending, startAi] = useTransition();
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  function onAiSuggest() {
    setAiError(null);
    setAiHint(null);
    startAi(async () => {
      const r = await enrichCoralPreviewAction(name, imageUrl || null);
      setDescription(r.description);
      setAiHint("AI suggested description.");
    });
  }

  return (
    <form action={saveAction} className="flex flex-col gap-4">
      <CoralInventoryFields
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        imageUrl={imageUrl}
        setImageUrl={setImageUrl}
        listingMode={listingMode}
        setListingMode={setListingMode}
        freeToGoodHome={freeToGoodHome}
        setFreeToGoodHome={setFreeToGoodHome}
        coralType={coralType}
        setCoralType={setCoralType}
        colour={colour}
        setColour={setColour}
        showImageUrlAndAiSuggest
        aiPending={aiPending}
        onAiSuggest={onAiSuggest}
        aiHint={aiHint}
        aiError={aiError}
      />
      <button type="submit" className="btn btn-primary min-h-11 rounded-xl">
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
  defaults: SharedInventoryDefaults & { species: string; colour: string; reefSafe: boolean | null };
}) {
  const [species, setSpecies] = useState(defaults.species);
  const [colour, setColour] = useState(
    defaults.colour && isActiveCoralColour(defaults.colour) ? defaults.colour : "",
  );
  const [reefSafe, setReefSafe] = useState<string>(
    defaults.reefSafe === true ? "true" : defaults.reefSafe === false ? "false" : "",
  );

  return (
    <form action={saveAction} className="flex flex-col gap-4">
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
      <label className="form-control w-full">
        <span className="label-text font-medium">Description</span>
        <textarea
          name="description"
          rows={5}
          defaultValue={defaults.description}
          className="textarea textarea-bordered w-full rounded-xl"
        />
      </label>
      <label className="form-control w-full">
        <span className="label-text font-medium">Image URL</span>
        <input
          name="imageUrl"
          type="url"
          maxLength={2048}
          defaultValue={defaults.imageUrl}
          className="input input-bordered w-full rounded-xl"
        />
      </label>
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
      <div className="grid gap-3 sm:grid-cols-2">
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
          </select>
        </label>
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
      </div>
      <label className="form-control w-full">
        <span className="label-text font-medium">How you prefer to swap</span>
        <select name="listingMode" defaultValue={defaults.listingMode} className="select select-bordered w-full rounded-xl">
          <option value={CoralListingMode.POST}>Post</option>
          <option value={CoralListingMode.MEET}>Meet</option>
          <option value={CoralListingMode.BOTH}>Post or meet</option>
        </select>
      </label>
      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" name="freeToGoodHome" defaultChecked={defaults.freeToGoodHome} className="checkbox" />
        <span className="text-sm">Free to good home</span>
      </label>
      <button type="submit" className="btn btn-primary min-h-11 rounded-xl">
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
  return (
    <form action={saveAction} className="flex flex-col gap-4">
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
      <label className="form-control w-full">
        <span className="label-text font-medium">Description</span>
        <textarea
          name="description"
          rows={5}
          defaultValue={defaults.description}
          className="textarea textarea-bordered w-full rounded-xl"
        />
      </label>
      <label className="form-control w-full">
        <span className="label-text font-medium">Image URL</span>
        <input
          name="imageUrl"
          type="url"
          maxLength={2048}
          defaultValue={defaults.imageUrl}
          className="input input-bordered w-full rounded-xl"
        />
      </label>
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
      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" name="freeToGoodHome" defaultChecked={defaults.freeToGoodHome} className="checkbox" />
        <span className="text-sm">Free to good home</span>
      </label>
      <button type="submit" className="btn btn-primary min-h-11 rounded-xl">
        Save
      </button>
    </form>
  );
}
