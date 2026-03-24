"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CoralProfileStatus,
  ExchangeKind,
  TradeCoralEventHandoffStatus,
  TradeCoralSide,
  TradeStatus,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { computeTradeExpiresAt } from "@/lib/trade-expiry";
import { expireDueTradesAndNotify, stampExpiredAndNotifyIfNeeded } from "@/lib/trade-expire-notify";
import { getRequestOrigin } from "@/lib/request-origin";
import {
  recipientUserIdsAfterCounter,
  scheduleTradeNotifications,
} from "@/lib/notifications/trade-events";
import { isTradePending, nextStatusAfterCounter, tradeResponderUserId } from "@/lib/trade-state";
import { consumeRateLimitToken } from "@/lib/rate-limit";
import { getGroupAddressGate } from "@/lib/group-address-gate";

function enforceTradeMutationRateLimit(userId: string) {
  if (!consumeRateLimitToken(`trade:mut:${userId}`, 48, 10 * 60 * 1000)) {
    redirect("/exchanges?error=trade-rate-limit");
  }
}

function uniq(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

function str(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function collectIds(formData: FormData, key: string) {
  const raw = formData.getAll(key);
  return uniq(raw.map((v) => (typeof v === "string" ? v.trim() : "")));
}

function parseVersion(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    return null;
  }
  return n;
}

function tradeDetailPath(exchangeId: string, tradeId: string, err?: string) {
  const base = `/exchanges/${encodeURIComponent(exchangeId)}/trades/${encodeURIComponent(tradeId)}`;
  return err ? `${base}?error=${encodeURIComponent(err)}` : base;
}

async function loadTradeForMember(
  db: ReturnType<typeof getPrisma>,
  exchangeId: string,
  tradeId: string,
  userId: string,
) {
  const trade = await db.trade.findFirst({
    where: {
      id: tradeId,
      exchangeId,
      OR: [{ initiatorUserId: userId }, { peerUserId: userId }],
    },
    include: {
      exchange: true,
      corals: { include: { coral: true } },
    },
  });
  return trade;
}

/**
 * Validates listing + ownership, creates trade in OFFER (peer must respond).
 */
export async function submitTradeInitiationAction(formData: FormData) {
  const user = await requireUser();
  enforceTradeMutationRateLimit(user.id);
  const exchangeId = str(formData.get("exchangeId"));
  const peerUserId = str(formData.get("peerUserId"));
  const initiatorCoralIds = collectIds(formData, "initiatorCoralIds");
  const peerCoralIds = collectIds(formData, "peerCoralIds");

  if (!exchangeId || !peerUserId || initiatorCoralIds.length === 0 || peerCoralIds.length === 0) {
    redirect(`/exchanges/${exchangeId || "unknown"}/trade?error=selection&with=${encodeURIComponent(peerUserId)}`);
  }

  if (peerUserId === user.id) {
    redirect(`/exchanges/${exchangeId}/trade?error=self`);
  }
  const addressGate = await getGroupAddressGate(exchangeId, user.id, `/exchanges/${exchangeId}/trade?with=${encodeURIComponent(peerUserId)}`);
  if (addressGate.blocked) {
    redirect(addressGate.redirectPath ?? `/exchanges/${exchangeId}/trade?error=address-required-group`);
  }

  const db = getPrisma();
  const [myMembership, peerMembership, exchange] = await Promise.all([
    db.exchangeMembership.findFirst({ where: { exchangeId, userId: user.id } }),
    db.exchangeMembership.findFirst({ where: { exchangeId, userId: peerUserId } }),
    db.exchange.findUnique({ where: { id: exchangeId } }),
  ]);

  if (!myMembership || !peerMembership || !exchange) {
    redirect(`/exchanges/${exchangeId}/trade?error=membership&with=${encodeURIComponent(peerUserId)}`);
  }

  const now = new Date();

  const initiatorCorals = await db.coral.findMany({
    where: { id: { in: initiatorCoralIds }, userId: user.id, profileStatus: CoralProfileStatus.UNLISTED },
  });
  const peerCorals = await db.coral.findMany({
    where: { id: { in: peerCoralIds }, userId: peerUserId, profileStatus: CoralProfileStatus.UNLISTED },
  });

  if (initiatorCorals.length !== initiatorCoralIds.length || peerCorals.length !== peerCoralIds.length) {
    redirect(`/exchanges/${exchangeId}/trade?error=coral&with=${encodeURIComponent(peerUserId)}`);
  }

  const listings = await db.exchangeListing.findMany({
    where: {
      exchangeId,
      coralId: { in: [...initiatorCoralIds, ...peerCoralIds] },
      expiresAt: { gt: now },
    },
  });
  const listed = new Set(listings.map((l) => l.coralId));
  for (const id of [...initiatorCoralIds, ...peerCoralIds]) {
    if (!listed.has(id)) {
      redirect(`/exchanges/${exchangeId}/trade?error=listing&with=${encodeURIComponent(peerUserId)}`);
    }
  }

  const expiresAt = computeTradeExpiresAt(now, exchange);

  const trade = await db.trade.create({
    data: {
      exchangeId,
      initiatorUserId: user.id,
      peerUserId,
      status: TradeStatus.OFFER,
      expiresAt,
      corals: {
        create: [
          ...initiatorCoralIds.map((coralId) => ({
            coralId,
            side: TradeCoralSide.INITIATOR,
          })),
          ...peerCoralIds.map((coralId) => ({
            coralId,
            side: TradeCoralSide.PEER,
          })),
        ],
      },
    },
  });

  const origin = await getRequestOrigin();
  scheduleTradeNotifications({
    baseUrl: origin,
    kind: "offered",
    exchangeId,
    exchangeName: exchange.name,
    tradeId: trade.id,
    actorUserId: user.id,
    initiatorUserId: user.id,
    peerUserId,
  });

  revalidatePath(`/exchanges/${exchangeId}/trades`);
  revalidatePath(`/exchanges/${exchangeId}/trade`);
  revalidatePath("/explore");
  redirect(`/exchanges/${exchangeId}/trades/${trade.id}`);
}

export async function acceptTradeAction(formData: FormData) {
  const user = await requireUser();
  enforceTradeMutationRateLimit(user.id);
  const exchangeId = str(formData.get("exchangeId"));
  const tradeId = str(formData.get("tradeId"));
  const versionRaw = str(formData.get("version"));

  if (!exchangeId || !tradeId) {
    redirect("/exchanges?error=trade-invalid");
  }
  const addressGate = await getGroupAddressGate(exchangeId, user.id, tradeDetailPath(exchangeId, tradeId));
  if (addressGate.blocked) {
    redirect(addressGate.redirectPath ?? tradeDetailPath(exchangeId, tradeId, "address-required-group"));
  }

  const version = parseVersion(versionRaw);
  if (version === null) {
    redirect(tradeDetailPath(exchangeId, tradeId, "stale"));
  }

  const db = getPrisma();
  const now = new Date();
  const baseUrl = await getRequestOrigin();
  await expireDueTradesAndNotify(db, { baseUrl, now, tradeIds: [tradeId] });

  const result = await db.$transaction(async (tx) => {
    const trade = await tx.trade.findFirst({
      where: { id: tradeId, exchangeId },
      include: { corals: { include: { coral: true } }, exchange: true },
    });

    if (!trade) {
      return { ok: false as const, code: "missing" as const };
    }

    if (!isTradePending(trade)) {
      return { ok: false as const, code: trade.status === TradeStatus.EXPIRED ? "expired" : "not-pending" };
    }

    if (trade.expiresAt.getTime() <= now.getTime()) {
      await tx.trade.update({
        where: { id: tradeId },
        data: { status: TradeStatus.EXPIRED },
      });
      return { ok: false as const, code: "expired" as const };
    }

    const responder = tradeResponderUserId(trade);
    if (responder !== user.id) {
      return { ok: false as const, code: "not-your-turn" as const };
    }

    const coralIds = trade.corals.map((c) => c.coralId);
    const initiatorIds = trade.corals.filter((c) => c.side === TradeCoralSide.INITIATOR).map((c) => c.coralId);
    const peerIds = trade.corals.filter((c) => c.side === TradeCoralSide.PEER).map((c) => c.coralId);

    const corals = await tx.coral.findMany({
      where: { id: { in: coralIds } },
    });
    if (corals.length !== coralIds.length) {
      return { ok: false as const, code: "coral-missing" as const };
    }

    const byId = new Map(corals.map((c) => [c.id, c]));
    for (const id of initiatorIds) {
      const c = byId.get(id);
      if (!c || c.userId !== trade.initiatorUserId || c.profileStatus !== CoralProfileStatus.UNLISTED) {
        return { ok: false as const, code: "coral-unavailable" as const };
      }
    }
    for (const id of peerIds) {
      const c = byId.get(id);
      if (!c || c.userId !== trade.peerUserId || c.profileStatus !== CoralProfileStatus.UNLISTED) {
        return { ok: false as const, code: "coral-unavailable" as const };
      }
    }

    const listings = await tx.exchangeListing.findMany({
      where: {
        exchangeId: trade.exchangeId,
        coralId: { in: coralIds },
        expiresAt: { gt: now },
      },
    });
    if (listings.length !== coralIds.length) {
      return { ok: false as const, code: "listing-gone" as const };
    }

    const updated = await tx.trade.updateMany({
      where: {
        id: tradeId,
        version,
        status: { in: [TradeStatus.OFFER, TradeStatus.COUNTERED] },
        expiresAt: { gt: now },
      },
      data: {
        status: TradeStatus.APPROVED,
        version: { increment: 1 },
      },
    });

    if (updated.count !== 1) {
      return { ok: false as const, code: "race" as const };
    }

    await tx.exchangeListing.deleteMany({ where: { coralId: { in: coralIds } } });
    await tx.coral.updateMany({
      where: { id: { in: coralIds } },
      data: { profileStatus: CoralProfileStatus.TRADED },
    });

    if (trade.exchange.kind === ExchangeKind.EVENT) {
      await tx.tradeCoral.updateMany({
        where: { tradeId },
        data: { eventHandoffStatus: TradeCoralEventHandoffStatus.AWAITING_CHECKIN },
      });
    }

    return { ok: true as const };
  });

  revalidatePath(`/exchanges/${exchangeId}/trades`);
  revalidatePath(`/exchanges/${exchangeId}/trades/${tradeId}`);
  revalidatePath(`/exchanges/${exchangeId}/trade`);
  revalidatePath(`/exchanges/${exchangeId}/event-ops`);
  revalidatePath(`/exchanges/${exchangeId}/event-pickup`);
  revalidatePath("/explore");
  revalidatePath("/my-corals");

  if (!result.ok) {
    if (result.code === "expired") {
      await stampExpiredAndNotifyIfNeeded(db, { baseUrl, tradeId, now });
    }
    if (result.code === "missing") {
      redirect("/exchanges?error=trade-missing");
    }
    redirect(tradeDetailPath(exchangeId, tradeId, result.code));
  }

  const approvedRow = await db.trade.findUnique({
    where: { id: tradeId },
    select: {
      exchangeId: true,
      initiatorUserId: true,
      peerUserId: true,
      exchange: { select: { name: true } },
    },
  });
  if (approvedRow) {
    scheduleTradeNotifications({
      baseUrl,
      kind: "approved",
      exchangeId: approvedRow.exchangeId,
      exchangeName: approvedRow.exchange.name,
      tradeId,
      actorUserId: user.id,
      initiatorUserId: approvedRow.initiatorUserId,
      peerUserId: approvedRow.peerUserId,
    });
  }

  redirect(tradeDetailPath(exchangeId, tradeId, "approved"));
}

export async function rejectTradeAction(formData: FormData) {
  const user = await requireUser();
  enforceTradeMutationRateLimit(user.id);
  const exchangeId = str(formData.get("exchangeId"));
  const tradeId = str(formData.get("tradeId"));
  const versionRaw = str(formData.get("version"));

  if (!exchangeId || !tradeId) {
    redirect("/exchanges?error=trade-invalid");
  }
  const addressGate = await getGroupAddressGate(exchangeId, user.id, tradeDetailPath(exchangeId, tradeId));
  if (addressGate.blocked) {
    redirect(addressGate.redirectPath ?? tradeDetailPath(exchangeId, tradeId, "address-required-group"));
  }

  const version = parseVersion(versionRaw);
  if (version === null) {
    redirect(tradeDetailPath(exchangeId, tradeId, "stale"));
  }

  const db = getPrisma();
  const now = new Date();
  const baseUrl = await getRequestOrigin();
  await expireDueTradesAndNotify(db, { baseUrl, now, tradeIds: [tradeId] });

  const trade = await loadTradeForMember(db, exchangeId, tradeId, user.id);
  if (!trade) {
    redirect("/exchanges?error=trade-missing");
  }

  if (!isTradePending(trade)) {
    redirect(tradeDetailPath(exchangeId, tradeId, "not-pending"));
  }

  if (trade.expiresAt.getTime() <= now.getTime()) {
    await db.trade.update({ where: { id: tradeId }, data: { status: TradeStatus.EXPIRED } });
    await stampExpiredAndNotifyIfNeeded(db, { baseUrl, tradeId, now });
    redirect(tradeDetailPath(exchangeId, tradeId, "expired"));
  }

  const responder = tradeResponderUserId(trade);
  if (responder !== user.id) {
    redirect(tradeDetailPath(exchangeId, tradeId, "not-your-turn"));
  }

  const updated = await db.trade.updateMany({
    where: {
      id: tradeId,
      version,
      status: { in: [TradeStatus.OFFER, TradeStatus.COUNTERED] },
      expiresAt: { gt: now },
    },
    data: {
      status: TradeStatus.REJECTED,
      version: { increment: 1 },
    },
  });

  revalidatePath(`/exchanges/${exchangeId}/trades`);
  revalidatePath(`/exchanges/${exchangeId}/trades/${tradeId}`);

  if (updated.count !== 1) {
    redirect(tradeDetailPath(exchangeId, tradeId, "race"));
  }

  scheduleTradeNotifications({
    baseUrl,
    kind: "rejected",
    exchangeId,
    exchangeName: trade.exchange.name,
    tradeId,
    actorUserId: user.id,
    initiatorUserId: trade.initiatorUserId,
    peerUserId: trade.peerUserId,
  });

  redirect(tradeDetailPath(exchangeId, tradeId, "rejected"));
}

export async function counterTradeAction(formData: FormData) {
  const user = await requireUser();
  enforceTradeMutationRateLimit(user.id);
  const exchangeId = str(formData.get("exchangeId"));
  const tradeId = str(formData.get("tradeId"));
  const versionRaw = str(formData.get("version"));
  const initiatorCoralIds = collectIds(formData, "initiatorCoralIds");
  const peerCoralIds = collectIds(formData, "peerCoralIds");

  if (!exchangeId || !tradeId || initiatorCoralIds.length === 0 || peerCoralIds.length === 0) {
    if (exchangeId && tradeId) {
      redirect(tradeDetailPath(exchangeId, tradeId, "counter-invalid"));
    }
    redirect("/exchanges?error=trade-invalid");
  }
  const addressGate = await getGroupAddressGate(exchangeId, user.id, tradeDetailPath(exchangeId, tradeId));
  if (addressGate.blocked) {
    redirect(addressGate.redirectPath ?? tradeDetailPath(exchangeId, tradeId, "address-required-group"));
  }

  const version = parseVersion(versionRaw);
  if (version === null) {
    redirect(tradeDetailPath(exchangeId, tradeId, "stale"));
  }

  const db = getPrisma();
  const now = new Date();
  const baseUrl = await getRequestOrigin();
  await expireDueTradesAndNotify(db, { baseUrl, now, tradeIds: [tradeId] });

  const trade = await loadTradeForMember(db, exchangeId, tradeId, user.id);
  if (!trade) {
    redirect("/exchanges?error=trade-missing");
  }

  if (!isTradePending(trade)) {
    redirect(tradeDetailPath(exchangeId, tradeId, "not-pending"));
  }

  if (trade.expiresAt.getTime() <= now.getTime()) {
    await db.trade.update({ where: { id: tradeId }, data: { status: TradeStatus.EXPIRED } });
    await stampExpiredAndNotifyIfNeeded(db, { baseUrl, tradeId, now });
    redirect(tradeDetailPath(exchangeId, tradeId, "expired"));
  }

  const responder = tradeResponderUserId(trade);
  if (responder !== user.id) {
    redirect(tradeDetailPath(exchangeId, tradeId, "not-your-turn"));
  }

  const previousStatus = trade.status;

  const initiatorCorals = await db.coral.findMany({
    where: {
      id: { in: initiatorCoralIds },
      userId: trade.initiatorUserId,
      profileStatus: CoralProfileStatus.UNLISTED,
    },
  });
  const peerCorals = await db.coral.findMany({
    where: {
      id: { in: peerCoralIds },
      userId: trade.peerUserId,
      profileStatus: CoralProfileStatus.UNLISTED,
    },
  });

  if (initiatorCorals.length !== initiatorCoralIds.length || peerCorals.length !== peerCoralIds.length) {
    redirect(tradeDetailPath(exchangeId, tradeId, "coral"));
  }

  const listings = await db.exchangeListing.findMany({
    where: {
      exchangeId,
      coralId: { in: [...initiatorCoralIds, ...peerCoralIds] },
      expiresAt: { gt: now },
    },
  });
  const listed = new Set(listings.map((l) => l.coralId));
  for (const id of [...initiatorCoralIds, ...peerCoralIds]) {
    if (!listed.has(id)) {
      redirect(tradeDetailPath(exchangeId, tradeId, "listing"));
    }
  }

  const nextStatus = nextStatusAfterCounter(trade.status);
  const expiresAt = computeTradeExpiresAt(now, trade.exchange);

  const updated = await db.$transaction(async (tx) => {
    const u = await tx.trade.updateMany({
      where: {
        id: tradeId,
        version,
        status: { in: [TradeStatus.OFFER, TradeStatus.COUNTERED] },
        expiresAt: { gt: now },
      },
      data: {
        status: nextStatus,
        version: { increment: 1 },
        expiresAt,
      },
    });

    if (u.count !== 1) {
      return false;
    }

    await tx.tradeCoral.deleteMany({ where: { tradeId } });
    await tx.tradeCoral.createMany({
      data: [
        ...initiatorCoralIds.map((coralId) => ({
          tradeId,
          coralId,
          side: TradeCoralSide.INITIATOR,
        })),
        ...peerCoralIds.map((coralId) => ({
          tradeId,
          coralId,
          side: TradeCoralSide.PEER,
        })),
      ],
    });

    return true;
  });

  revalidatePath(`/exchanges/${exchangeId}/trades`);
  revalidatePath(`/exchanges/${exchangeId}/trades/${tradeId}`);
  revalidatePath(`/exchanges/${exchangeId}/trade`);
  revalidatePath("/explore");

  if (!updated) {
    redirect(tradeDetailPath(exchangeId, tradeId, "race"));
  }

  const counterRecipients = recipientUserIdsAfterCounter(
    previousStatus === TradeStatus.OFFER ? "OFFER" : "COUNTERED",
    trade.initiatorUserId,
    trade.peerUserId,
  );

  scheduleTradeNotifications({
    baseUrl,
    kind: "countered",
    exchangeId,
    exchangeName: trade.exchange.name,
    tradeId,
    actorUserId: user.id,
    initiatorUserId: trade.initiatorUserId,
    peerUserId: trade.peerUserId,
    counterRecipients,
  });

  redirect(tradeDetailPath(exchangeId, tradeId, "countered"));
}
