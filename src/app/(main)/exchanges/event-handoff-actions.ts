"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ExchangeKind,
  TradeCoralEventHandoffStatus,
  TradeStatus,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageEventDesk } from "@/lib/super-admin";
import { recipientUserIdForHandoff } from "@/lib/event-handoff";
import { getRequestOrigin } from "@/lib/request-origin";
import { scheduleCoralCheckedInNotifications } from "@/lib/notifications/event-handoff-notify";

function str(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function uniq(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

function collectIds(formData: FormData, key: string) {
  const raw = formData.getAll(key);
  return uniq(raw.map((v) => (typeof v === "string" ? v.trim() : "")));
}

function eventOpsPath(exchangeId: string, err?: string) {
  const base = `/exchanges/${encodeURIComponent(exchangeId)}/event-ops`;
  return err ? `${base}?error=${encodeURIComponent(err)}` : base;
}

function eventPickupPath(exchangeId: string, err?: string) {
  const base = `/exchanges/${encodeURIComponent(exchangeId)}/event-pickup`;
  return err ? `${base}?error=${encodeURIComponent(err)}` : base;
}

export async function checkInTradeCoralsFormAction(formData: FormData) {
  const user = await requireUser();
  const exchangeId = str(formData.get("exchangeId"));
  const tradeCoralIds = collectIds(formData, "tradeCoralId");

  if (!exchangeId) {
    redirect("/exchanges?error=forbidden");
  }

  const db = getPrisma();
  const [exchange, membership] = await Promise.all([
    db.exchange.findUnique({ where: { id: exchangeId } }),
    db.exchangeMembership.findFirst({ where: { exchangeId, userId: user.id } }),
  ]);

  if (!exchange || exchange.kind !== ExchangeKind.EVENT || !canManageEventDesk(exchange, membership, user)) {
    redirect(eventOpsPath(exchangeId, "forbidden"));
  }

  if (tradeCoralIds.length === 0) {
    redirect(eventOpsPath(exchangeId, "invalid-selection"));
  }

  const lines = await db.tradeCoral.findMany({
    where: {
      id: { in: tradeCoralIds },
      eventHandoffStatus: TradeCoralEventHandoffStatus.AWAITING_CHECKIN,
      trade: {
        exchangeId,
        status: TradeStatus.APPROVED,
      },
    },
    select: {
      id: true,
      side: true,
      trade: { select: { initiatorUserId: true, peerUserId: true } },
    },
  });

  if (lines.length === 0) {
    redirect(eventOpsPath(exchangeId, "nothing-to-do"));
  }

  await db.tradeCoral.updateMany({
    where: { id: { in: lines.map((l) => l.id) } },
    data: { eventHandoffStatus: TradeCoralEventHandoffStatus.CHECKED_IN },
  });

  const recipientUserIds = [
    ...new Set(lines.map((l) => recipientUserIdForHandoff(l.side, l.trade))),
  ];
  const origin = await getRequestOrigin();
  scheduleCoralCheckedInNotifications({
    baseUrl: origin,
    exchangeId,
    exchangeName: exchange.name,
    recipientUserIds,
    count: lines.length,
  });

  revalidatePath(`/exchanges/${exchangeId}/event-ops`);
  revalidatePath(`/exchanges/${exchangeId}/event-pickup`);
  revalidatePath(`/exchanges/${exchangeId}`);

  redirect(`${eventOpsPath(exchangeId)}?checkedIn=${lines.length}`);
}

export async function checkOutTradeCoralFormAction(formData: FormData) {
  const user = await requireUser();
  const exchangeId = str(formData.get("exchangeId"));
  const tradeCoralId = str(formData.get("tradeCoralId"));

  if (!exchangeId || !tradeCoralId) {
    redirect("/exchanges?error=forbidden");
  }

  const db = getPrisma();
  const membership = await db.exchangeMembership.findFirst({
    where: { exchangeId, userId: user.id },
  });
  if (!membership) {
    redirect(eventPickupPath(exchangeId, "forbidden"));
  }

  const line = await db.tradeCoral.findFirst({
    where: {
      id: tradeCoralId,
      eventHandoffStatus: TradeCoralEventHandoffStatus.CHECKED_IN,
      trade: {
        exchangeId,
        status: TradeStatus.APPROVED,
      },
    },
    include: { trade: true },
  });

  if (!line) {
    redirect(eventPickupPath(exchangeId, "stale"));
  }

  if (recipientUserIdForHandoff(line.side, line.trade) !== user.id) {
    redirect(eventPickupPath(exchangeId, "not-recipient"));
  }

  const updated = await db.tradeCoral.updateMany({
    where: {
      id: tradeCoralId,
      eventHandoffStatus: TradeCoralEventHandoffStatus.CHECKED_IN,
    },
    data: { eventHandoffStatus: TradeCoralEventHandoffStatus.CHECKED_OUT },
  });

  if (updated.count !== 1) {
    redirect(eventPickupPath(exchangeId, "stale"));
  }

  revalidatePath(`/exchanges/${exchangeId}/event-ops`);
  revalidatePath(`/exchanges/${exchangeId}/event-pickup`);
  revalidatePath(`/exchanges/${exchangeId}`);

  redirect(`${eventPickupPath(exchangeId)}?checkedOut=1`);
}
