"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ExchangeLogoFieldProps = {
  initialImageUrl?: string | null;
  label?: string;
  helpText?: string;
};

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  await img.decode();
  return img;
}

async function renderSquareBlob(params: {
  src: string;
  mimeType: string;
  zoom: number;
  xOffsetPercent: number;
  yOffsetPercent: number;
}): Promise<Blob | null> {
  const source = await loadImage(params.src);
  const outSize = 512;
  const canvas = document.createElement("canvas");
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const baseScale = Math.max(outSize / source.width, outSize / source.height);
  const scale = baseScale * params.zoom;
  const drawW = source.width * scale;
  const drawH = source.height * scale;
  const overflowX = Math.max(0, drawW - outSize);
  const overflowY = Math.max(0, drawH - outSize);
  const xShift = (overflowX / 2) * params.xOffsetPercent;
  const yShift = (overflowY / 2) * params.yOffsetPercent;
  const dx = (outSize - drawW) / 2 - xShift;
  const dy = (outSize - drawH) / 2 - yShift;

  ctx.clearRect(0, 0, outSize, outSize);
  ctx.drawImage(source, dx, dy, drawW, drawH);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), params.mimeType, 0.92);
  });
}

export function ExchangeLogoField({
  initialImageUrl = null,
  label = "Exchange logo (optional)",
  helpText = "Crop to square before saving. JPG, PNG, or WebP up to 6MB.",
}: ExchangeLogoFieldProps) {
  const pickerRef = useRef<HTMLInputElement | null>(null);
  const submitFileRef = useRef<HTMLInputElement | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(initialImageUrl);
  const [draftObjectUrl, setDraftObjectUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [mimeType, setMimeType] = useState<string>("image/webp");
  const [zoom, setZoom] = useState<number>(1);
  const [xOffset, setXOffset] = useState<number>(0);
  const [yOffset, setYOffset] = useState<number>(0);

  const previewStyle = useMemo(
    () => ({
      transform: `translate(${xOffset}%, ${yOffset}%) scale(${zoom})`,
    }),
    [xOffset, yOffset, zoom],
  );

  useEffect(() => {
    return () => {
      if (draftObjectUrl) {
        URL.revokeObjectURL(draftObjectUrl);
      }
    };
  }, [draftObjectUrl]);

  useEffect(() => {
    let cancelled = false;

    async function assignCroppedFile() {
      if (!submitFileRef.current) return;
      if (!sourceUrl || !draftObjectUrl) {
        submitFileRef.current.value = "";
        return;
      }
      const blob = await renderSquareBlob({
        src: sourceUrl,
        mimeType,
        zoom,
        xOffsetPercent: xOffset / 100,
        yOffsetPercent: yOffset / 100,
      });
      if (!blob || cancelled || !submitFileRef.current) return;
      const dt = new DataTransfer();
      dt.items.add(new File([blob], fileName || "exchange-logo.webp", { type: mimeType }));
      submitFileRef.current.files = dt.files;
    }

    void assignCroppedFile();
    return () => {
      cancelled = true;
    };
  }, [draftObjectUrl, fileName, mimeType, sourceUrl, xOffset, yOffset, zoom]);

  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <legend className="px-1 text-sm font-semibold text-slate-700">{label}</legend>
      <input ref={submitFileRef} name="logoFile" type="file" className="hidden" tabIndex={-1} />

      <div className="flex flex-wrap items-start gap-3">
        <div className="relative h-28 w-28 overflow-hidden rounded-xl border border-slate-300 bg-white">
          {sourceUrl ? (
            <img
              src={sourceUrl}
              alt=""
              aria-hidden
              className="h-full w-full object-cover transition-transform"
              style={previewStyle}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">No image</div>
          )}
        </div>
        <div className="min-w-[220px] flex-1 space-y-2">
          <input
            ref={pickerRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="file-input file-input-bordered file-input-sm w-full max-w-xs"
            onChange={(event) => {
              const next = event.currentTarget.files?.[0] ?? null;
              if (!next) return;
              if (draftObjectUrl) {
                URL.revokeObjectURL(draftObjectUrl);
              }
              const nextUrl = URL.createObjectURL(next);
              setDraftObjectUrl(nextUrl);
              setSourceUrl(nextUrl);
              setMimeType(next.type || "image/webp");
              setFileName(next.name || "exchange-logo.webp");
              setZoom(1);
              setXOffset(0);
              setYOffset(0);
            }}
          />
          <p className="text-xs text-slate-500">{helpText}</p>
        </div>
      </div>

      {draftObjectUrl ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-xs text-slate-600">
            Zoom
            <input
              type="range"
              min={100}
              max={300}
              step={1}
              value={Math.round(zoom * 100)}
              className="range range-xs mt-1 w-full"
              onChange={(event) => setZoom(Number(event.currentTarget.value) / 100)}
            />
          </label>
          <label className="text-xs text-slate-600">
            Horizontal
            <input
              type="range"
              min={-100}
              max={100}
              step={1}
              value={xOffset}
              className="range range-xs mt-1 w-full"
              onChange={(event) => setXOffset(Number(event.currentTarget.value))}
            />
          </label>
          <label className="text-xs text-slate-600">
            Vertical
            <input
              type="range"
              min={-100}
              max={100}
              step={1}
              value={yOffset}
              className="range range-xs mt-1 w-full"
              onChange={(event) => setYOffset(Number(event.currentTarget.value))}
            />
          </label>
        </div>
      ) : null}
    </fieldset>
  );
}
