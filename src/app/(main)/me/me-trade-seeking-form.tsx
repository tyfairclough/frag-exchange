"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "nextjs-toploader/app";
import { updateTradeSeekingNotesAction } from "@/app/(main)/me/actions";
import {
  clampTradeSeekingNotes,
  MAX_TRADE_SEEKING_WORDS,
  tradeSeekingWordCount,
} from "@/lib/trade-seeking-notes";

type Props = {
  initialNotes: string;
};

export function MeTradeSeekingForm({ initialNotes }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const words = tradeSeekingWordCount(notes);

  function handleChange(raw: string) {
    setError(null);
    setSavedFlash(false);
    setNotes(clampTradeSeekingNotes(raw, MAX_TRADE_SEEKING_WORDS));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSavedFlash(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateTradeSeekingNotesAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedFlash(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="tradeSeekingNotes" value={notes} />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-base-content">
          What kinds of items are you hoping to trade?
        </span>
        <span className="text-xs text-base-content/70">
          This helps others understand what you might swap later. You can leave this blank.
        </span>
        <textarea
          className="textarea textarea-bordered min-h-32 w-full rounded-xl text-base"
          value={notes}
          onChange={(ev) => handleChange(ev.target.value)}
          placeholder="e.g. soft corals, small fish, test kits…"
          rows={6}
          disabled={pending}
          aria-describedby="trade-seeking-word-count"
        />
        <span id="trade-seeking-word-count" className="text-xs text-base-content/60">
          {words} / {MAX_TRADE_SEEKING_WORDS} words
        </span>
      </label>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      {savedFlash ? <p className="text-sm text-success">Saved.</p> : null}
      <button type="submit" className="btn btn-primary min-h-11 rounded-xl" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
