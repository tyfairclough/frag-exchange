import { randomInt } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";

export const MIN_ALIAS_GENERATOR_WORDS = 3;
export const MAX_USER_ALIAS_LENGTH = 80;

type UserDelegate = Pick<PrismaClient, "user">;

export async function fetchAliasWordStrings(prisma: PrismaClient): Promise<string[]> {
  const rows = await prisma.aliasGeneratorWord.findMany({
    select: { word: true },
    orderBy: { word: "asc" },
  });
  return rows.map((r) => r.word);
}

export function buildAliasCandidateFromWordList(words: string[]): string {
  if (words.length < MIN_ALIAS_GENERATOR_WORDS) {
    throw new Error("alias-words-insufficient");
  }
  const n = words.length;
  const pickedIndices = new Set<number>();
  while (pickedIndices.size < MIN_ALIAS_GENERATOR_WORDS) {
    pickedIndices.add(randomInt(0, n));
  }
  const picked = [...pickedIndices].map((i) => words[i]!);
  const digits = String(randomInt(0, 10000)).padStart(4, "0");
  return `${picked[0]}-${picked[1]}-${picked[2]}-${digits}`;
}

export async function otherUserHasAlias(
  db: UserDelegate,
  alias: string,
  excludeUserId: string,
): Promise<boolean> {
  const row = await db.user.findFirst({
    where: { alias, NOT: { id: excludeUserId } },
    select: { id: true },
  });
  return row !== null;
}

/** Used on the onboarding page so placeholder/hidden match a likely-free alias. */
export async function pickUniqueAliasCandidate(
  prisma: PrismaClient,
  userId: string,
  words: string[],
  maxAttempts = 25,
): Promise<string | null> {
  if (words.length < MIN_ALIAS_GENERATOR_WORDS) {
    return null;
  }
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = buildAliasCandidateFromWordList(words);
    if (candidate.length > MAX_USER_ALIAS_LENGTH) {
      continue;
    }
    const taken = await otherUserHasAlias(prisma, candidate, userId);
    if (!taken) {
      return candidate;
    }
  }
  return null;
}

export function normalizeAliasWordInput(raw: string): string {
  return raw.trim().toLowerCase();
}

const ALIAS_WORD_PATTERN = /^[a-z0-9]+$/;

export function validateAliasGeneratorWord(word: string): string | null {
  const w = normalizeAliasWordInput(word);
  if (!w) {
    return "Word is required.";
  }
  if (w.length > 64) {
    return "Word must be 64 characters or fewer.";
  }
  if (!ALIAS_WORD_PATTERN.test(w)) {
    return "Use lowercase letters and digits only.";
  }
  return null;
}

export function clampAliasFromClient(raw: string): string {
  return typeof raw === "string" ? raw.trim().slice(0, MAX_USER_ALIAS_LENGTH) : "";
}
