"use client";

import { useRef, useState, useTransition } from "react";
import { CoralListingMode } from "@/generated/prisma/enums";
import { enrichCoralPreviewAction } from "@/app/(main)/my-items/actions";
import { CoralInventoryFields } from "@/components/coral-inventory-fields";
import type { InventoryItemImageFieldHandle } from "@/components/inventory-item-image-field";

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

export type CoralInventoryFormDefaults = {
  name: string;
  description: string;
  imageUrl: string;
  listingMode: CoralListingMode;
  freeToGoodHome: boolean;
  coralType: string;
  colours: string[];
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
    colours: [],
  };

  const [name, setName] = useState(d.name);
  const [description, setDescription] = useState(d.description);
  const [imageUrl, setImageUrl] = useState(d.imageUrl);
  const [listingMode, setListingMode] = useState<CoralListingMode>(d.listingMode);
  const [freeToGoodHome, setFreeToGoodHome] = useState(d.freeToGoodHome);
  const [coralType, setCoralType] = useState(d.coralType);
  const [colours, setColours] = useState(d.colours);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPending, startAiTransition] = useTransition();
  const imageFieldRef = useRef<InventoryItemImageFieldHandle>(null);

  function runAiSuggest() {
    setAiError(null);
    setAiHint(null);
    startAiTransition(async () => {
      try {
        let url = imageUrl.trim() || null;
        const pending = imageFieldRef.current?.getFile();
        if (pending) {
          const up = new FormData();
          up.append("imageFile", pending);
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
        const result = await enrichCoralPreviewAction(name, url);
        setDescription(result.description);
        setCoralType(result.coralType ?? "");
        setColours(result.colours ?? []);
        setAiHint(
          result.source === "openai"
            ? "Suggestions from AI (you can edit before saving)."
            : "Starter text from offline suggestions — add a photo and set OPENAI_API_KEY for richer AI fills.",
        );
      } catch {
        setAiError("Could not get suggestions. Try again or fill fields manually.");
      }
    });
  }

  return (
    <form action={saveAction} encType="multipart/form-data" className="flex flex-col gap-4">
      <CoralInventoryFields
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        imageUrl={imageUrl}
        listingMode={listingMode}
        setListingMode={setListingMode}
        freeToGoodHome={freeToGoodHome}
        setFreeToGoodHome={setFreeToGoodHome}
        coralType={coralType}
        setCoralType={setCoralType}
        colours={colours}
        setColours={setColours}
        showImageUrlAndAiSuggest
        imageFieldRef={imageFieldRef}
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
