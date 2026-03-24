"use client";

import { useState, useTransition } from "react";
import { CoralListingMode } from "@/generated/prisma/enums";
import { enrichCoralPreviewAction } from "@/app/(main)/my-corals/actions";
import { CORAL_COLOURS, CORAL_TYPES } from "@/lib/coral-options";

export type CoralInventoryFormDefaults = {
  name: string;
  description: string;
  imageUrl: string;
  listingMode: CoralListingMode;
  freeToGoodHome: boolean;
  coralType: string;
  colour: string;
};

type Props = {
  saveAction: (formData: FormData) => Promise<void>;
  defaults?: CoralInventoryFormDefaults;
};

export function CoralInventoryForm({ saveAction, defaults }: Props) {
  const d = defaults ?? {
    name: "",
    description: "",
    imageUrl: "",
    listingMode: CoralListingMode.BOTH,
    freeToGoodHome: false,
    coralType: "",
    colour: "",
  };

  const [name, setName] = useState(d.name);
  const [description, setDescription] = useState(d.description);
  const [imageUrl, setImageUrl] = useState(d.imageUrl);
  const [listingMode, setListingMode] = useState<CoralListingMode>(d.listingMode);
  const [freeToGoodHome, setFreeToGoodHome] = useState(d.freeToGoodHome);
  const [coralType, setCoralType] = useState(d.coralType);
  const [colour, setColour] = useState(d.colour);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPending, startAiTransition] = useTransition();

  function runAiSuggest() {
    setAiError(null);
    setAiHint(null);
    startAiTransition(async () => {
      try {
        const result = await enrichCoralPreviewAction(name, imageUrl || null);
        setDescription(result.description);
        setCoralType(result.coralType ?? "");
        setColour(result.colour ?? "");
        setAiHint(
          result.source === "openai"
            ? "Suggestions from AI (you can edit before saving)."
            : "Starter text from offline suggestions — add a photo URL and set OPENAI_API_KEY for richer AI fills.",
        );
      } catch {
        setAiError("Could not get suggestions. Try again or fill fields manually.");
      }
    });
  }

  return (
    <form action={saveAction} className="flex flex-col gap-4">
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
          onClick={runAiSuggest}
        >
          {aiPending ? <span className="loading loading-spinner loading-sm" /> : null}
          Suggest fields (AI)
        </button>
      </div>

      {aiHint ? <p className="text-sm text-success">{aiHint}</p> : null}
      {aiError ? <p className="text-sm text-error">{aiError}</p> : null}

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

      <button type="submit" className="btn btn-primary min-h-11 rounded-xl">
        Save coral
      </button>
    </form>
  );
}
