"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { setUserPasswordAction } from "@/app/(main)/me/actions";
import { sliceForZxcvbn } from "@/lib/zxcvbn-password";

type ZxcvbnResult = {
  score: number;
  feedback: { warning: string; suggestions: string[] };
};

type ZxcvbnFn = (password: string, user_inputs?: string[]) => ZxcvbnResult;

let zxcvbnLoader: Promise<ZxcvbnFn> | null = null;

function loadZxcvbn(): Promise<ZxcvbnFn> {
  if (!zxcvbnLoader) {
    zxcvbnLoader = import("zxcvbn").then((m) => m.default as unknown as ZxcvbnFn);
  }
  return zxcvbnLoader;
}

const scoreLabel = (score: number): string => {
  if (score <= 0) return "Too weak";
  if (score === 1) return "Weak";
  if (score === 2) return "Fair";
  if (score === 3) return "Strong";
  return "Strong enough";
};

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export function MePasswordSection({
  hasPassword,
  userInputs,
}: {
  hasPassword: boolean;
  userInputs: string[];
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [score, setScore] = useState(0);
  const [feedbackWarning, setFeedbackWarning] = useState("");
  const [feedbackSuggestions, setFeedbackSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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

  useEffect(() => {
    if (!open) return;
    loadZxcvbn().catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      const z = await loadZxcvbn();
      if (cancelled) return;
      const sliced = sliceForZxcvbn(password);
      const r = z(sliced, userInputs);
      setScore(r.score);
      setFeedbackWarning(r.feedback.warning ?? "");
      setFeedbackSuggestions(r.feedback.suggestions ?? []);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [open, password, userInputs]);

  function openModal() {
    setError(null);
    setPassword("");
    setShowPassword(false);
    setScore(0);
    setFeedbackWarning("");
    setFeedbackSuggestions([]);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setError(null);
    setPassword("");
    setShowPassword(false);
  }

  const canSubmit = score === 4 && password.length > 0 && !pending;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    const fd = new FormData();
    fd.set("password", password);
    startTransition(async () => {
      const result = await setUserPasswordAction(fd);
      if (result.ok) {
        closeModal();
        toast.success("Password saved.");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="min-w-0 text-base-content/80">
      <div className="space-y-1">
        <p className="text-base-content/90">{hasPassword ? "Set" : "None"}</p>
        <button type="button" className="link link-primary text-sm" onClick={openModal}>
          {hasPassword ? "Reset password" : "Add password"}
        </button>
      </div>

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
            <h2 className="text-base font-semibold text-base-content">
              {hasPassword ? "Update password" : "Set password"}
            </h2>
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
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
              <p className="text-sm text-base-content/70">
                Use a long, unique password. It must reach the top strength level (4 of 4) before you can save. If you
                forget it, you can still sign in with a magic link from the login page.
              </p>

              <label className="form-control w-full">
                <span className="label-text text-sm font-medium">New password</span>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="new-password"
                    className="input input-bordered w-full rounded-xl pr-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-circle absolute right-1 top-1/2 min-h-9 w-9 -translate-y-1/2 text-base-content/70 hover:text-base-content"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
              </label>

              <div className="mt-8 space-y-2">
                <div className="flex gap-1" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full transition-colors ${
                        i < score ? "bg-success" : "bg-base-content/15"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs font-medium text-base-content/80">
                  Strength: {scoreLabel(score)} ({score}/4)
                </p>
                {feedbackWarning ? (
                  <p className="text-xs text-warning">{feedbackWarning}</p>
                ) : null}
                {feedbackSuggestions.length > 0 ? (
                  <ul className="list-inside list-disc text-xs text-base-content/70">
                    {feedbackSuggestions.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {error ? (
                <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
                  {error}
                </div>
              ) : null}
            </div>
            <div className="flex gap-2 border-t border-base-content/10 px-4 py-3">
              <button type="button" className="btn btn-ghost flex-1 rounded-xl" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary flex-1 rounded-xl" disabled={!canSubmit}>
                {pending ? "Saving…" : hasPassword ? "Update password" : "Save password"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
}
