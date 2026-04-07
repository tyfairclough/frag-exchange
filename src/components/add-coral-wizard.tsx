"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { CoralListingMode } from "@/generated/prisma/enums";
import { createCoralAction } from "@/app/(main)/my-corals/actions";
import { AddCoralImageBar } from "@/components/add-coral-image-bar";
import { CoralInventoryFields } from "@/components/coral-inventory-fields";

type VisionApiResult = {
  name: string | null;
  description: string;
  coralType: string | null;
  colour: string | null;
  source: "openai" | "stub";
};

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

export function AddCoralWizard() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoStepDone, setPhotoStepDone] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl] = useState("");
  const [listingMode, setListingMode] = useState<CoralListingMode>(CoralListingMode.BOTH);
  const [freeToGoodHome, setFreeToGoodHome] = useState(false);
  const [coralType, setCoralType] = useState("");
  const [colour, setColour] = useState("");

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

  function handleFileSelected(next: File) {
    setVisionError(null);
    setVerifyBanner(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
  }

  function handleClear() {
    setVisionError(null);
    setVerifyBanner(false);
    setPhotoStepDone(false);
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
        const res = await fetch("/api/my-corals/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(messageForApiError(j.error));
        }
        const result = (await res.json()) as VisionApiResult;
        if (result.source === "openai") {
          if (result.name) setName(result.name);
          setDescription(result.description);
          setCoralType(result.coralType ?? "");
          setColour(result.colour ?? "");
          setVerifyBanner(true);
        } else {
          setVisionError(
            "Could not analyze the photo (check OPENAI_API_KEY and use a vision-capable model such as gpt-4o-mini). You can still fill the form manually.",
          );
        }
      } catch (e) {
        setVisionError(e instanceof Error ? e.message : "Something went wrong. Try again or fill the form manually.");
      } finally {
        setPhotoStepDone(true);
      }
    });
  }

  async function handleSaveForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    let uploadedImageUrl = "";
    try {
      if (file && file.size > 0) {
        const up = new FormData();
        up.append("imageFile", file);
        const upRes = await fetch("/api/my-corals/upload-image", {
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
      fd.append("name", name.trim());
      fd.append("description", description);
      fd.append("imageUrl", uploadedImageUrl);
      fd.append("listingMode", listingMode);
      if (freeToGoodHome) {
        fd.append("freeToGoodHome", "on");
      }
      fd.append("coralType", coralType);
      fd.append("colour", colour);

      startSave(() => {
        createCoralAction(fd)
          .catch((err: unknown) => {
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
          <p className="max-w-xs text-center text-sm font-medium text-base-content">
            Identifying your coral…
          </p>
        </div>
      ) : null}

      {!file ? (
        <div className="mb-4 overflow-hidden rounded-2xl border border-base-content/10 bg-base-200/30">
          <div
            className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-teal-50/90 to-cyan-100/80"
            aria-hidden
          >
            <span className="text-5xl opacity-50">🪸</span>
            <span className="px-4 text-center text-sm text-base-content/50">Add a photo to get started</span>
            <span className="sr-only">Placeholder — no coral photo yet</span>
          </div>
        </div>
      ) : null}

      {photoStepDone && previewUrl ? (
        <div className="mb-4 flex items-center gap-3">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-base-content/10 bg-base-200/30">
            <Image
              src={previewUrl}
              alt="Selected coral"
              fill
              className="object-cover"
              unoptimized
              sizes="80px"
            />
          </div>
          <p className="text-sm text-base-content/60">Photo attached — add details below.</p>
        </div>
      ) : null}

      {!photoStepDone && file && previewUrl ? (
        <div className="mb-4 overflow-hidden rounded-2xl border border-base-content/10 bg-base-200/30">
          <div className="relative aspect-[4/3] w-full">
            <Image
              src={previewUrl}
              alt="Selected coral"
              fill
              className="object-cover"
              unoptimized
              sizes="(max-width: 32rem) 100vw, 32rem"
            />
          </div>
        </div>
      ) : null}

      <form onSubmit={(e) => void handleSaveForm(e)} className="flex flex-col gap-4">
        {photoStepDone ? (
          <>
            {verifyBanner ? (
              <div className="alert alert-info text-sm shadow-sm">
                <span>Please check what the details are correct before submitting.</span>
              </div>
            ) : null}

            {visionError ? <p className="text-sm text-error">{visionError}</p> : null}
            {saveError ? <p className="text-sm text-error">{saveError}</p> : null}

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

            <button type="submit" className="btn btn-primary min-h-11 rounded-xl" disabled={saveBusy}>
              {saveBusy ? <span className="loading loading-spinner loading-sm" /> : null}
              Save coral
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
