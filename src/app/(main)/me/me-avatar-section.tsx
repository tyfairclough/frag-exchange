"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "nextjs-toploader/app";
import { setUserAvatarAction } from "@/app/(main)/me/actions";
import { SquareImageUploadField } from "@/components/square-image-upload-field";
import { userAvatarUrlForUi } from "@/lib/avatar-image-urls";

const AVATAR_CHOICES = ["🐠", "🪸", "🐙", "🦀", "🐡", "🐟", "🦐", "🪼"] as const;

export function MeAvatarSection({
  avatarEmoji,
  avatar40Url,
  avatar80Url,
  avatar256Url,
}: {
  avatarEmoji: string | null;
  avatar40Url: string | null;
  avatar80Url: string | null;
  avatar256Url: string | null;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const currentAvatarImageUrl = userAvatarUrlForUi({ avatar40Url, avatar80Url, avatar256Url });
  const [open, setOpen] = useState(false);
  const [avatarMode, setAvatarMode] = useState<"emoji" | "image">(currentAvatarImageUrl ? "image" : "emoji");
  const [selectedAvatar, setSelectedAvatar] = useState(avatarEmoji ?? "🐠");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  function openModal() {
    setError(null);
    setSelectedAvatar(avatarEmoji ?? "🐠");
    setAvatarMode(currentAvatarImageUrl ? "image" : "emoji");
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("avatarMode", avatarMode);
    if (avatarMode === "emoji") {
      fd.set("avatarEmoji", selectedAvatar);
    }
    startTransition(async () => {
      const result = await setUserAvatarAction(fd);
      if (result.ok) {
        closeModal();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className="group relative inline-flex h-12 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-primary/15 text-2xl transition hover:bg-primary/25"
        onClick={openModal}
        aria-label="Change avatar"
      >
        {currentAvatarImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentAvatarImageUrl} alt="" className="h-full w-full object-cover" aria-hidden />
        ) : (
          <span className="transition-opacity duration-150 sm:group-hover:opacity-0 sm:group-focus-visible:opacity-0">
            {avatarEmoji ?? "🐠"}
          </span>
        )}
        <span
          className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-primary/20 text-base opacity-0 transition-opacity duration-150 sm:flex sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100"
          aria-hidden
        >
          ⇄
        </span>
        <span className="sr-only">change avatar</span>
      </button>

      <dialog
        ref={dialogRef}
        className="modal modal-middle"
        onCancel={(ev) => {
          ev.preventDefault();
          closeModal();
        }}
        onClose={() => setOpen(false)}
      >
        <div className="modal-box flex max-h-[min(85dvh,36rem)] w-full max-w-lg flex-col p-0">
          <div className="flex items-center justify-between border-b border-base-content/10 px-4 py-3">
            <h2 className="text-base font-semibold text-base-content">Change avatar</h2>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-circle min-h-9 w-9"
              aria-label="Close"
              onClick={closeModal}
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
              <p className="text-sm text-base-content/70">Pick an emoji or upload your own avatar image.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAvatarMode("emoji")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    avatarMode === "emoji" ? "bg-primary/15 text-primary" : "bg-base-200 text-base-content/70"
                  }`}
                >
                  Emoji
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarMode("image")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    avatarMode === "image" ? "bg-primary/15 text-primary" : "bg-base-200 text-base-content/70"
                  }`}
                >
                  Upload image
                </button>
              </div>
              {avatarMode === "image" ? (
                <SquareImageUploadField
                  inputName="avatarFile"
                  initialImageUrl={currentAvatarImageUrl}
                  label="Avatar image"
                  helpText="Crop to square before saving. JPG, PNG, or WebP up to 6MB."
                  outputFileName="avatar.webp"
                />
              ) : null}
              <input type="hidden" name="avatarMode" value={avatarMode} />
              <input type="hidden" name="avatarEmoji" value={selectedAvatar} />
              <div className="grid grid-cols-4 gap-2">
                {AVATAR_CHOICES.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedAvatar(emoji)}
                    className={`rounded-xl border px-2 py-3 text-2xl transition ${
                      avatarMode === "emoji" && selectedAvatar === emoji
                        ? "border-primary bg-primary/10"
                        : "border-base-content/20 bg-base-100"
                    }`}
                    aria-pressed={avatarMode === "emoji" && selectedAvatar === emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {error ? (
                <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">{error}</div>
              ) : null}
            </div>
            <div className="flex gap-2 border-t border-base-content/10 px-4 py-3">
              <button type="button" className="btn btn-ghost flex-1 rounded-xl" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary flex-1 rounded-xl" disabled={pending}>
                {pending ? "Saving…" : "Save avatar"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
