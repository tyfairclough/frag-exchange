"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { CoralListingMode, InventoryKind } from "@/generated/prisma/enums";
import { createInventoryItemAction } from "@/app/(main)/my-items/actions";
import { AddCoralImageBar } from "@/components/add-coral-image-bar";
import { CoralInventoryFields } from "@/components/coral-inventory-fields";
import type { InventoryAiVisionResult } from "@/lib/coral-ai";
import { CORAL_COLOURS } from "@/lib/coral-options";
import {
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_CATEGORY_VALUES,
  EQUIPMENT_CONDITION_LABELS,
  EQUIPMENT_CONDITION_VALUES,
} from "@/lib/equipment-options";

function messageForApiError(code: string | undefined): string {
  switch (code) {
    case "unauthorized":
      return "You need to be signed in.";
    case "image-too-large":
      return "Photo is too large (max 6 MB). Choose a smaller image.";
    case "invalid-image-type":
      return "Use a JPEG, PNG, or WebP photo.";
    case "enrichment-failed":
      return "Could not analyze the photo. Try again or fill the form manually.";
    default:
      return "Something went wrong. Try again.";
  }
}

function readFileAsBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const s = fr.result as string;
      const comma = s.indexOf(",");
      const base64 = comma >= 0 ? s.slice(comma + 1) : s;
      const mime = file.type?.trim().toLowerCase() || "image/jpeg";
      resolve({ base64, mimeType: mime });
    };
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

function resetKindFields(
  next: InventoryKind,
  vision: InventoryAiVisionResult | null,
): {
  name: string;
  description: string;
  coralType: string;
  colour: string;
  species: string;
  reefSafe: string;
  equipmentCategory: string;
  equipmentCondition: string;
} {
  const base = {
    name: vision?.name ?? "",
    description: vision?.description ?? "",
    coralType: "",
    colour: "",
    species: "",
    reefSafe: "",
    equipmentCategory: "",
    equipmentCondition: "",
  };
  if (!vision || vision.source !== "openai") {
    return base;
  }
  if (next === InventoryKind.CORAL) {
    return {
      ...base,
      coralType: vision.coralType ?? "",
      colour: vision.colour ?? "",
    };
  }
  if (next === InventoryKind.FISH) {
    return {
      ...base,
      colour: vision.colour ?? "",
      species: vision.species ?? "",
      reefSafe:
        vision.reefSafe === true ? "true" : vision.reefSafe === false ? "false" : "",
    };
  }
  return {
    ...base,
    equipmentCategory: vision.equipmentCategory ?? "",
    equipmentCondition: vision.equipmentCondition ?? "",
  };
}

export function AddItemWizard() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoStepDone, setPhotoStepDone] = useState(false);
  const [visionResult, setVisionResult] = useState<InventoryAiVisionResult | null>(null);

  const [kind, setKind] = useState<InventoryKind | "">("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl] = useState("");
  const [listingMode, setListingMode] = useState<CoralListingMode>(CoralListingMode.BOTH);
  const [freeToGoodHome, setFreeToGoodHome] = useState(false);
  const [coralType, setCoralType] = useState("");
  const [colour, setColour] = useState("");
  const [species, setSpecies] = useState("");
  const [reefSafe, setReefSafe] = useState("");
  const [equipmentCategory, setEquipmentCategory] = useState("");
  const [equipmentCondition, setEquipmentCondition] = useState("");

  const [verifyBanner, setVerifyBanner] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);
  const [visionPending, startVision] = useTransition();
  const [savePending, startSave] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function applyVision(v: InventoryAiVisionResult) {
    setVisionResult(v);
    if (v.name) setName(v.name);
    setDescription(v.description);
    if (v.source === "openai" && v.itemKind) {
      setKind(v.itemKind);
      const r = resetKindFields(v.itemKind, v);
      setCoralType(r.coralType);
      setColour(r.colour);
      setSpecies(r.species);
      setReefSafe(r.reefSafe);
      setEquipmentCategory(r.equipmentCategory);
      setEquipmentCondition(r.equipmentCondition);
      setVerifyBanner(true);
    } else {
      setKind("");
      setVerifyBanner(false);
    }
  }

  function handleFileSelected(next: File) {
    setVisionError(null);
    setVerifyBanner(false);
    setVisionResult(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
  }

  function handleClear() {
    setVisionError(null);
    setVerifyBanner(false);
    setPhotoStepDone(false);
    setVisionResult(null);
    setKind("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
  }

  function handleSubmitVision() {
    if (!file) return;
    setVisionError(null);
    setVerifyBanner(false);
    startVision(async () => {
      try {
        const { base64, mimeType } = await readFileAsBase64(file);
        const res = await fetch("/api/my-items/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(messageForApiError(j.error));
        }
        const result = (await res.json()) as InventoryAiVisionResult;
        applyVision(result);
        if (result.source !== "openai") {
          setVisionError(
            "Could not classify the photo automatically. Pick an item type below and complete the fields.",
          );
        }
      } catch (e) {
        setVisionError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      } finally {
        setPhotoStepDone(true);
      }
    });
  }

  function onKindChange(next: InventoryKind | "") {
    setKind(next);
    if (!next) return;
    const r = resetKindFields(next, visionResult);
    setCoralType(r.coralType);
    setColour(r.colour);
    setSpecies(r.species);
    setReefSafe(r.reefSafe);
    setEquipmentCategory(r.equipmentCategory);
    setEquipmentCondition(r.equipmentCondition);
  }

  async function handleSaveForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveError(null);
    if (!kind) {
      setSaveError("Choose an item type.");
      return;
    }
    if (kind === InventoryKind.EQUIPMENT && (!equipmentCategory || !equipmentCondition)) {
      setSaveError("Select equipment type and condition.");
      return;
    }
    setIsSaving(true);

    let uploadedImageUrl = "";
    try {
      if (file && file.size > 0) {
        const up = new FormData();
        up.append("imageFile", file);
        const upRes = await fetch("/api/my-items/upload-image", {
          method: "POST",
          body: up,
          credentials: "include",
        });
        if (!upRes.ok) {
          const j = (await upRes.json().catch(() => ({}))) as { error?: string };
          setSaveError(messageForApiError(j.error));
          setIsSaving(false);
          return;
        }
        const upData = (await upRes.json()) as { imageUrl: string };
        uploadedImageUrl = upData.imageUrl;
      }

      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("name", name.trim());
      fd.append("description", description);
      fd.append("imageUrl", uploadedImageUrl);
      fd.append("listingMode", listingMode);
      if (freeToGoodHome) {
        fd.append("freeToGoodHome", "on");
      }
      if (kind === InventoryKind.CORAL) {
        fd.append("coralType", coralType);
        fd.append("colour", colour);
      } else if (kind === InventoryKind.FISH) {
        fd.append("colour", colour);
        fd.append("species", species);
        if (reefSafe) fd.append("reefSafe", reefSafe);
      } else {
        fd.append("equipmentCategory", equipmentCategory);
        fd.append("equipmentCondition", equipmentCondition);
      }

      startSave(() => {
        createInventoryItemAction(fd).catch((err: unknown) => {
          setSaveError(err instanceof Error ? err.message : "Save failed");
          setIsSaving(false);
        });
      });
    } catch {
      setSaveError("Something went wrong. Try again.");
      setIsSaving(false);
    }
  }

  const hasImage = Boolean(previewUrl && file);
  const imageBarPhase = photoStepDone ? "done" : hasImage ? "analyze" : "pick";
  const saveBusy = isSaving || savePending;

  return (
    <div className="relative flex flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))]">
      {visionPending ? (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-base-300/70 px-6 backdrop-blur-sm"
          role="alert"
          aria-busy="true"
          aria-live="polite"
        >
          <span className="loading loading-spinner loading-lg text-primary" />
          <p className="max-w-xs text-center text-sm font-medium text-base-content">Analyzing your photo…</p>
        </div>
      ) : null}

      {!file ? (
        <div className="mb-4 overflow-hidden rounded-2xl border border-base-content/10 bg-base-200/30">
          <div
            className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-teal-50/90 to-cyan-100/80"
            aria-hidden
          >
            <span className="text-5xl opacity-50">📷</span>
            <span className="px-4 text-center text-sm text-base-content/50">Add a photo to get started</span>
          </div>
        </div>
      ) : null}

      {photoStepDone && previewUrl ? (
        <div className="mb-4 flex items-center gap-3">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-base-content/10 bg-base-200/30">
            <Image src={previewUrl} alt="" fill className="object-cover" unoptimized sizes="80px" />
          </div>
          <p className="text-sm text-base-content/60">Photo attached — choose type and details below.</p>
        </div>
      ) : null}

      {!photoStepDone && file && previewUrl ? (
        <div className="mb-4 overflow-hidden rounded-2xl border border-base-content/10 bg-base-200/30">
          <div className="relative aspect-[4/3] w-full">
            <Image src={previewUrl} alt="" fill className="object-cover" unoptimized sizes="(max-width: 32rem) 100vw, 32rem" />
          </div>
        </div>
      ) : null}

      <form onSubmit={(e) => void handleSaveForm(e)} className="flex flex-col gap-4">
        {photoStepDone ? (
          <>
            {verifyBanner ? (
              <div className="alert alert-info text-sm shadow-sm">
                <span>Please verify details before submitting — you can change the item type if needed.</span>
              </div>
            ) : null}

            {visionError ? <p className="text-sm text-warning">{visionError}</p> : null}
            {saveError ? <p className="text-sm text-error">{saveError}</p> : null}

            <label className="form-control w-full">
              <span className="label-text font-medium">Item type</span>
              <select
                className="select select-bordered w-full rounded-xl"
                value={kind}
                onChange={(e) => onKindChange((e.target.value || "") as InventoryKind | "")}
                required
              >
                <option value="" disabled>
                  Select type…
                </option>
                <option value={InventoryKind.CORAL}>Coral</option>
                <option value={InventoryKind.FISH}>Fish</option>
                <option value={InventoryKind.EQUIPMENT}>Equipment</option>
              </select>
            </label>

            {kind === InventoryKind.CORAL ? (
              <CoralInventoryFields
                name={name}
                setName={setName}
                description={description}
                setDescription={setDescription}
                imageUrl={imageUrl}
                setImageUrl={() => {}}
                listingMode={listingMode}
                setListingMode={setListingMode}
                freeToGoodHome={freeToGoodHome}
                setFreeToGoodHome={setFreeToGoodHome}
                coralType={coralType}
                setCoralType={setCoralType}
                colour={colour}
                setColour={setColour}
                showImageUrlAndAiSuggest={false}
                aiPending={false}
                onAiSuggest={() => {}}
                aiHint={null}
                aiError={null}
              />
            ) : null}

            {kind === InventoryKind.FISH ? (
              <>
                <label className="form-control w-full">
                  <span className="label-text font-medium">Name</span>
                  <input
                    name="name"
                    required
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input input-bordered w-full rounded-xl"
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text font-medium">Description</span>
                  <textarea
                    name="description"
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="textarea textarea-bordered w-full rounded-xl"
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text font-medium">Species</span>
                  <input
                    value={species}
                    onChange={(e) => setSpecies(e.target.value)}
                    maxLength={200}
                    className="input input-bordered w-full rounded-xl"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="form-control w-full">
                    <span className="label-text font-medium">Colour</span>
                    <select
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
                  <select
                    className="select select-bordered w-full rounded-xl"
                    value={listingMode}
                    onChange={(e) => setListingMode(e.target.value as CoralListingMode)}
                  >
                    <option value={CoralListingMode.POST}>Post</option>
                    <option value={CoralListingMode.MEET}>Meet</option>
                    <option value={CoralListingMode.BOTH}>Post or meet</option>
                  </select>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={freeToGoodHome}
                    onChange={(e) => setFreeToGoodHome(e.target.checked)}
                    className="checkbox"
                  />
                  <span className="text-sm">Free to good home</span>
                </label>
              </>
            ) : null}

            {kind === InventoryKind.EQUIPMENT ? (
              <>
                <label className="form-control w-full">
                  <span className="label-text font-medium">Name</span>
                  <input
                    required
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input input-bordered w-full rounded-xl"
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text font-medium">Description</span>
                  <textarea
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="textarea textarea-bordered w-full rounded-xl"
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text font-medium">Type</span>
                  <select
                    className="select select-bordered w-full rounded-xl"
                    value={equipmentCategory}
                    onChange={(e) => setEquipmentCategory(e.target.value)}
                    required
                  >
                    <option value="">Select…</option>
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
                    className="select select-bordered w-full rounded-xl"
                    value={equipmentCondition}
                    onChange={(e) => setEquipmentCondition(e.target.value)}
                    required
                  >
                    <option value="">Select…</option>
                    {EQUIPMENT_CONDITION_VALUES.map((k) => (
                      <option key={k} value={k}>
                        {EQUIPMENT_CONDITION_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control w-full">
                  <span className="label-text font-medium">How you prefer to swap</span>
                  <select
                    className="select select-bordered w-full rounded-xl"
                    value={listingMode}
                    onChange={(e) => setListingMode(e.target.value as CoralListingMode)}
                  >
                    <option value={CoralListingMode.POST}>Post</option>
                    <option value={CoralListingMode.MEET}>Meet</option>
                    <option value={CoralListingMode.BOTH}>Post or meet</option>
                  </select>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={freeToGoodHome}
                    onChange={(e) => setFreeToGoodHome(e.target.checked)}
                    className="checkbox"
                  />
                  <span className="text-sm">Free to good home</span>
                </label>
              </>
            ) : null}

            <button type="submit" className="btn btn-primary min-h-11 rounded-xl" disabled={saveBusy || !kind}>
              {saveBusy ? <span className="loading loading-spinner loading-sm" /> : null}
              Save item
            </button>
          </>
        ) : null}
      </form>

      <AddCoralImageBar
        phase={imageBarPhase}
        onFileSelected={handleFileSelected}
        onClear={handleClear}
        onSubmitVision={handleSubmitVision}
        visionDisabled={visionPending}
      />
    </div>
  );
}
