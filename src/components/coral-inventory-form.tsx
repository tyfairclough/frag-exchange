"use client";

import { useRef, useState, useTransition } from "react";
import { CoralListingMode, ListingIntent } from "@/generated/prisma/enums";
import { enrichCoralPreviewAction } from "@/app/(main)/my-items/actions";
import { CoralInventoryFields } from "@/components/coral-inventory-fields";
import type { InventoryItemImageFieldHandle } from "@/components/inventory-item-image-field";
import {
  prepareInventoryImageForUpload,
  replaceFormDataImageFileWithNormalized,
} from "@/lib/prepare-inventory-vision-image-client";

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
  listingIntent: ListingIntent;
  salePrice: string;
  saleCurrency: string;
  saleExternalUrl: string;
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
    listingIntent: ListingIntent.SWAP,
    salePrice: "",
    saleCurrency: "GBP",
    saleExternalUrl: "",
    coralType: "",
    colours: [],
  };

  const [name, setName] = useState(d.name);
  const [description, setDescription] = useState(d.description);
  const [imageUrl, setImageUrl] = useState(d.imageUrl);
  const [listingMode, setListingMode] = useState<CoralListingMode>(d.listingMode);
  const [listingIntent, setListingIntent] = useState(d.listingIntent);
  const [salePrice, setSalePrice] = useState(d.salePrice);
  const [saleCurrency, setSaleCurrency] = useState(d.saleCurrency);
  const [saleExternalUrl, setSaleExternalUrl] = useState(d.saleExternalUrl);
  const [coralType, setCoralType] = useState(d.coralType);
  const [colours, setColours] = useState(d.colours);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPending, startAiTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const imageFieldRef = useRef<InventoryItemImageFieldHandle>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      await replaceFormDataImageFileWithNormalized(fd);
      await saveAction(fd);
    } finally {
      setSubmitting(false);
    }
  }

  function runAiSuggest() {
    setAiError(null);
    setAiHint(null);
    startAiTransition(async () => {
      try {
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
    <form onSubmit={(e) => void handleSubmit(e)} encType="multipart/form-data" className="flex flex-col gap-4">
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
        imageFieldRef={imageFieldRef}
        aiPending={aiPending}
        onAiSuggest={runAiSuggest}
        aiHint={aiHint}
        aiError={aiError}
      />

      <button type="submit" className="btn btn-primary min-h-11 rounded-xl" disabled={submitting}>
        Save coral
      </button>
    </form>
  );
}
