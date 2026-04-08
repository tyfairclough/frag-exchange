import { cookies } from "next/headers";

const TRADE_DRAFT_COOKIE = "fe_trade_init_draft_v1";
const DRAFT_MAX_AGE_SECONDS = 2 * 60 * 60;
const MAX_IDS_PER_SIDE = 64;

export type TradeInitiationDraft = {
  receiveItemIds: string[];
  offerItemIds: string[];
  updatedAt: number;
};

type DraftStore = Record<string, TradeInitiationDraft>;

export type TradeSelectionRuleInput = {
  receiveCount: number;
  offerCount: number;
  receiveAllFreeToGoodHome: boolean;
};

export function canSubmitTradeSelection(input: TradeSelectionRuleInput): boolean {
  if (input.receiveCount < 1) {
    return false;
  }
  if (input.receiveAllFreeToGoodHome) {
    return true;
  }
  return input.offerCount >= 1;
}

export function requiresOfferItems(receiveAllFreeToGoodHome: boolean): boolean {
  return !receiveAllFreeToGoodHome;
}

function uniqIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, MAX_IDS_PER_SIDE);
}

function parseStore(raw: string | undefined): DraftStore {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const out: DraftStore = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!value || typeof value !== "object") continue;
      const row = value as Partial<TradeInitiationDraft>;
      const receiveItemIds = Array.isArray(row.receiveItemIds)
        ? uniqIds(row.receiveItemIds.filter((v): v is string => typeof v === "string"))
        : [];
      const offerItemIds = Array.isArray(row.offerItemIds)
        ? uniqIds(row.offerItemIds.filter((v): v is string => typeof v === "string"))
        : [];
      const updatedAt = typeof row.updatedAt === "number" && Number.isFinite(row.updatedAt) ? row.updatedAt : Date.now();
      out[key] = { receiveItemIds, offerItemIds, updatedAt };
    }
    return out;
  } catch {
    return {};
  }
}

export function buildTradeDraftKey(exchangeId: string, viewerUserId: string, peerUserId: string): string {
  return `${exchangeId}:${viewerUserId}:${peerUserId}`;
}

async function readStore(): Promise<DraftStore> {
  const store = await cookies();
  return parseStore(store.get(TRADE_DRAFT_COOKIE)?.value);
}

async function writeStore(next: DraftStore) {
  const store = await cookies();
  store.set(TRADE_DRAFT_COOKIE, JSON.stringify(next), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DRAFT_MAX_AGE_SECONDS,
  });
}

export async function getTradeInitiationDraft(
  exchangeId: string,
  viewerUserId: string,
  peerUserId: string,
): Promise<TradeInitiationDraft> {
  const key = buildTradeDraftKey(exchangeId, viewerUserId, peerUserId);
  const all = await readStore();
  const row = all[key];
  if (!row) {
    return { receiveItemIds: [], offerItemIds: [], updatedAt: Date.now() };
  }
  return {
    receiveItemIds: uniqIds(row.receiveItemIds),
    offerItemIds: uniqIds(row.offerItemIds),
    updatedAt: row.updatedAt,
  };
}

export async function setTradeInitiationDraft(
  exchangeId: string,
  viewerUserId: string,
  peerUserId: string,
  next: { receiveItemIds?: string[]; offerItemIds?: string[] },
) {
  const key = buildTradeDraftKey(exchangeId, viewerUserId, peerUserId);
  const all = await readStore();
  const prev = all[key] ?? { receiveItemIds: [], offerItemIds: [], updatedAt: Date.now() };
  all[key] = {
    receiveItemIds: next.receiveItemIds ? uniqIds(next.receiveItemIds) : prev.receiveItemIds,
    offerItemIds: next.offerItemIds ? uniqIds(next.offerItemIds) : prev.offerItemIds,
    updatedAt: Date.now(),
  };
  await writeStore(all);
}

export async function clearTradeInitiationDraft(exchangeId: string, viewerUserId: string, peerUserId: string) {
  const key = buildTradeDraftKey(exchangeId, viewerUserId, peerUserId);
  const all = await readStore();
  if (!all[key]) {
    return;
  }
  delete all[key];
  await writeStore(all);
}
