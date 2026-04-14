export const MAX_TRADE_SEEKING_WORDS = 50;

/** Words = non-empty segments separated by whitespace (same as server validation). */
export function tradeSeekingWordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/** If over the word limit, keep the first `max` words (single spaces between). */
export function clampTradeSeekingNotes(text: string, max = MAX_TRADE_SEEKING_WORDS): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/);
  if (words.length <= max) return text;
  return words.slice(0, max).join(" ");
}
