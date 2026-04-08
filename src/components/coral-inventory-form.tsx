"use client";

import { useState, useTransition } from "react";
import { CoralListingMode } from "@/generated/prisma/enums";
import { enrichCoralPreviewAction } from "@/app/(main)/my-items/actions";
import { CoralInventoryFields } from "@/components/coral-inventory-fields";

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
        onAiSuggest={runAiSuggest}
        aiHint={aiHint}
        aiError={aiError}
      />

      <button type="submit" className="btn btn-primary min-h-11 rounded-xl">
        Save coral
      </button>
    </form>
  );
}
