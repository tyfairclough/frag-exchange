"use client";

import Image from "next/image";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

/** Dispatched by the edit screen bottom bar to open the same file picker as the in-form control. */
export const INVENTORY_IMAGE_PICKER_OPEN_EVENT = "reefx:inventory-open-image-picker";

export type InventoryItemImageFieldHandle = {
  getFile: () => File | null;
  clearStagedFile: () => void;
};

type Props = {
  /** Last saved image URL (e.g. from DB). Hidden field value; updated by parent after client-side upload (e.g. AI). */
  committedImageUrl: string;
  className?: string;
  /** Called when the user selects a local file (before save). */
  onFileSelected?: () => void;
  /** When true, opens the file input when `INVENTORY_IMAGE_PICKER_OPEN_EVENT` is dispatched (e.g. bottom bar on edit). Hides the inline Add/Change image button. */
  openOnGlobalPickerEvent?: boolean;
};

export const InventoryItemImageField = forwardRef<InventoryItemImageFieldHandle, Props>(
  function InventoryItemImageField({ committedImageUrl, className, onFileSelected, openOnGlobalPickerEvent }, ref) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [stagedObjectUrl, setStagedObjectUrl] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      getFile: () => fileInputRef.current?.files?.[0] ?? null,
      clearStagedFile: () => {
        if (stagedObjectUrl) URL.revokeObjectURL(stagedObjectUrl);
        setStagedObjectUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    }));

    useEffect(() => {
      return () => {
        if (stagedObjectUrl) URL.revokeObjectURL(stagedObjectUrl);
      };
    }, [stagedObjectUrl]);

    useEffect(() => {
      if (!openOnGlobalPickerEvent) return;
      const onOpen = () => fileInputRef.current?.click();
      window.addEventListener(INVENTORY_IMAGE_PICKER_OPEN_EVENT, onOpen);
      return () => window.removeEventListener(INVENTORY_IMAGE_PICKER_OPEN_EVENT, onOpen);
    }, [openOnGlobalPickerEvent]);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
      const f = e.target.files?.[0];
      if (stagedObjectUrl) URL.revokeObjectURL(stagedObjectUrl);
      if (f) {
        setStagedObjectUrl(URL.createObjectURL(f));
        onFileSelected?.();
      } else {
        setStagedObjectUrl(null);
      }
    }

    const displaySrc = stagedObjectUrl || committedImageUrl;

    return (
      <div className={className}>
        <input type="hidden" name="imageUrl" value={committedImageUrl} readOnly />
        <input
          ref={fileInputRef}
          type="file"
          name="imageFile"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose image file"
          onChange={handleFileChange}
        />
        <div className="overflow-hidden rounded-2xl border border-base-content/10 bg-base-200/30">
          <div className="relative aspect-[4/3] w-full bg-base-200/50">
            {displaySrc ? (
              <Image
                src={displaySrc}
                alt=""
                fill
                className="object-cover"
                loading="eager"
                unoptimized
                sizes="(max-width: 32rem) 100vw, 32rem"
              />
            ) : (
              <div className="flex h-full min-h-[12rem] w-full items-center justify-center text-sm text-base-content/50">
                No image yet
              </div>
            )}
          </div>
        </div>
        {!openOnGlobalPickerEvent ? (
          <button
            type="button"
            className="btn btn-outline mt-2 min-h-11 w-full rounded-xl sm:w-auto"
            onClick={() => fileInputRef.current?.click()}
          >
            {displaySrc ? "Change image" : "Add image"}
          </button>
        ) : null}
      </div>
    );
  },
);

InventoryItemImageField.displayName = "InventoryItemImageField";

/** Shared layout for item photo preview (e.g. add-item wizard). */
export function InventoryItemImagePreview({ src, className }: { src: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-base-content/10 bg-base-200/30 ${className ?? ""}`}>
      <div className="relative aspect-[4/3] w-full bg-base-200/50">
        <Image
          src={src}
          alt=""
          fill
          className="object-cover"
          loading="eager"
          unoptimized
          sizes="(max-width: 32rem) 100vw, 32rem"
        />
      </div>
    </div>
  );
}
