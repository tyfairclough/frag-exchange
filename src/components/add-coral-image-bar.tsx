"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

export type AddCoralImageBarPhase = "pick" | "analyze" | "done";

export type AddCoralImageBarHandle = {
  openDesktopFilePicker: () => void;
  /** Opens gallery (mobile) or desktop file picker — for “change photo” after analysis. */
  openChangePhotoPicker: () => void;
};

type Props = {
  phase: AddCoralImageBarPhase;
  onFileSelected: (file: File) => void;
  onClear: () => void;
  onSubmitVision: () => void;
  visionDisabled?: boolean;
  /** When set, “Change photo” in the done phase runs this (e.g. open picker) instead of clearing everything. */
  onChangePhoto?: () => void;
};

export const AddCoralImageBar = forwardRef<AddCoralImageBarHandle, Props>(function AddCoralImageBar(
  { phase, onFileSelected, onClear, onSubmitVision, visionDisabled, onChangePhoto },
  ref,
) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const desktopRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    openDesktopFilePicker: () => desktopRef.current?.click(),
    openChangePhotoPicker: () => {
      if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
        desktopRef.current?.click();
      } else {
        galleryRef.current?.click();
      }
    },
  }));

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      onFileSelected(f);
    }
    e.target.value = "";
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur supports-[backdrop-filter]:bg-white/90 md:left-1/2 md:max-w-2xl md:-translate-x-1/2 md:rounded-t-2xl md:border md:border-b-0 md:shadow-lg"
      aria-label="Add coral photo"
    >
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={handleFileChange}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={handleFileChange}
      />
      <input
        ref={desktopRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={handleFileChange}
      />

      {phase === "pick" ? (
        <>
          <ul className="mx-auto flex max-w-2xl items-stretch justify-around gap-1 px-2 pt-1 md:hidden">
            <li className="flex-1">
              <button
                type="button"
                className="touch-manipulation flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 text-slate-500 transition-colors active:bg-slate-200 hover:bg-slate-100 hover:text-slate-800"
                onClick={() => cameraRef.current?.click()}
              >
                <CameraIcon />
                <span className="text-[0.65rem] font-medium leading-none">Camera</span>
              </button>
            </li>
            <li className="flex-1">
              <button
                type="button"
                className="touch-manipulation flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 text-slate-500 transition-colors active:bg-slate-200 hover:bg-slate-100 hover:text-slate-800"
                onClick={() => galleryRef.current?.click()}
              >
                <PhotosIcon />
                <span className="text-[0.65rem] font-medium leading-none">Photos</span>
              </button>
            </li>
          </ul>
          <div className="mx-auto hidden max-w-2xl px-4 py-2 md:block">
            <button
              type="button"
              className="btn btn-outline btn-block min-h-12 rounded-xl border-slate-200"
              onClick={() => desktopRef.current?.click()}
            >
              <span className="inline-flex items-center gap-2">
                <ImagePlusIcon />
                Add photo
              </span>
            </button>
          </div>
        </>
      ) : phase === "analyze" ? (
        <ul className="mx-auto flex max-w-2xl items-stretch gap-2 px-3 py-2">
          <li className="flex-1">
            <button
              type="button"
              className="btn btn-outline btn-block min-h-12 rounded-xl border-slate-200"
              onClick={onClear}
            >
              Clear
            </button>
          </li>
          <li className="flex-1">
            <button
              type="button"
              className="btn btn-primary btn-block min-h-12 rounded-xl"
              disabled={visionDisabled}
              onClick={onSubmitVision}
            >
              Submit
            </button>
          </li>
        </ul>
      ) : (
        <div className="mx-auto max-w-2xl px-3 py-2">
          <button
            type="button"
            className="btn btn-outline btn-block min-h-12 rounded-xl border-slate-200"
            onClick={() => (onChangePhoto ? onChangePhoto() : onClear())}
          >
            Change photo
          </button>
        </div>
      )}
    </nav>
  );
});

AddCoralImageBar.displayName = "AddCoralImageBar";

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M4 7a2 2 0 0 1 2-2h1.5L8.4 3.6A2 2 0 0 1 10.07 3h3.86a2 2 0 0 1 1.73 1l.9 1.5H18a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function PhotosIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <rect x="3" y="5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="m7 15 2.5-3 2 2.5L14 11l3 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8.5" r="1" fill="currentColor" />
      <path
        d="M17 7h4a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2h-9a1 1 0 0 1-1-1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ImagePlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 14l2.5-3 2 2.5L15 10l4 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M15 3v4M13 5h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
