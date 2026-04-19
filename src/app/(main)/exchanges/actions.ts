"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ExchangeKind,
  ExchangeMembershipRole,
  ExchangeVisibility,
} from "@/generated/prisma/enums";
import { assertDatabaseReachable, getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { getRequestOrigin } from "@/lib/request-origin";
import {
  canAccessOperatorDashboard,
  canEditExchangeLogo,
  canIssuePrivateInvite,
  canPromoteEventManager,
  canViewExchangeDirectory,
  isSuperAdmin,
} from "@/lib/super-admin";
import { logAdminAudit } from "@/lib/admin-audit";
import { getRequestIp } from "@/lib/rate-limit";
import { saveExchangeLogoToPublic, validateExchangeLogoUpload } from "@/lib/exchange-logo-upload";
import { hashExchangeInviteToken } from "@/lib/exchange-invite-token-hash";
import { normalizeInviteEmail } from "@/lib/bulk-invite-parse";
import { sendExchangeInviteEmail } from "@/lib/send-exchange-invite-email";

function makeToken() {
  return randomBytes(32).toString("hex");
}

function str(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

/** Hidden field `from=reefers` returns users to the exchange Reefers tab after promote/demote. */
function eventManagerActionRedirectBase(exchangeId: string, formData: FormData): string {
  return str(formData.get("from")) === "reefers"
    ? `/exchanges/${exchangeId}/reefers`
    : `/operator/${exchangeId}`;
}

function parseKind(raw: string): ExchangeKind {
  if (raw === ExchangeKind.GROUP) {
    return ExchangeKind.GROUP;
  }
  return ExchangeKind.EVENT;
}

function parseVisibility(raw: string): ExchangeVisibility {
  if (raw === ExchangeVisibility.PRIVATE) {
    return ExchangeVisibility.PRIVATE;
  }
  return ExchangeVisibility.PUBLIC;
}

function parseAllowedItemTypes(formData: FormData) {
  const allowCoral = formData.get("allowCoral") === "on";
  const allowFish = formData.get("allowFish") === "on";
  const allowEquipment = formData.get("allowEquipment") === "on";
  const allowItemsForSale = formData.get("allowItemsForSale") === "on";
  return { allowCoral, allowFish, allowEquipment, allowItemsForSale };
}

function hasAtLeastOneAllowedItemType(allowed: {
  allowCoral: boolean;
  allowFish: boolean;
  allowEquipment: boolean;
}) {
  return allowed.allowCoral || allowed.allowFish || allowed.allowEquipment;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export type BulkInviteResultRow =
  | { email: string; inviteUrl: string; emailDelivery: "sent" | "skipped" | "failed" }
  | { email: string; error: string };

async function processExchangeLogoFromFormData(
  exchangeId: string,
  formData: FormData,
): Promise<{ logo40Url: string; logo80Url: string; logo512Url: string; logoUpdatedAt: Date } | null> {
  const logoFile = formData.get("logoFile");
  if (!(logoFile instanceof File) || logoFile.size <= 0) {
    return null;
  }

  const logoError = validateExchangeLogoUpload(logoFile);
  if (logoError) {
    throw new Error(`exchange-logo:${logoError}`);
  }

  const logoBuffer = Buffer.from(await logoFile.arrayBuffer());
  return saveExchangeLogoToPublic({
    exchangeId,
    buffer: logoBuffer,
    mimeType: logoFile.type,
  });
}

export async function createExchangeAction(formData: FormData) {
  const admin = await requireSuperAdmin();

  const name = str(formData.get("name"));
  const description = str(formData.get("description")) || null;
  const kind = parseKind(str(formData.get("kind")));
  const visibility = parseVisibility(str(formData.get("visibility")));
  const allowedTypes = parseAllowedItemTypes(formData);
  const eventDateRaw = str(formData.get("eventDate"));
  let eventDate: Date | null = null;
  if (eventDateRaw) {
    const d = new Date(eventDateRaw);
    if (!Number.isNaN(d.getTime())) {
      eventDate = d;
    }
  }
  if (kind === ExchangeKind.EVENT && !eventDate) {
    redirect("/exchanges/new?error=event-date");
  }
  if (kind === ExchangeKind.GROUP) {
    eventDate = null;
  }

  if (!name) {
    redirect("/exchanges/new?error=name");
  }
  if (!hasAtLeastOneAllowedItemType(allowedTypes)) {
    redirect("/exchanges/new?error=item-types");
  }

  try {
    const created = await getPrisma().exchange.create({
      data: {
        name,
        description,
        kind,
        visibility,
        eventDate,
        allowCoral: allowedTypes.allowCoral,
        allowFish: allowedTypes.allowFish,
        allowEquipment: allowedTypes.allowEquipment,
        allowItemsForSale: allowedTypes.allowItemsForSale,
        createdById: admin.id,
        memberships: {
          create: {
            userId: admin.id,
            role: ExchangeMembershipRole.MEMBER,
          },
        },
      },
    });
    const logo = await processExchangeLogoFromFormData(created.id, formData);
    if (logo) {
      await getPrisma().exchange.update({
        where: { id: created.id },
        data: logo,
      });
    }
    const ip = await getRequestIp();
    await logAdminAudit({
      actorUserId: admin.id,
      action: "exchange.create",
      targetType: "exchange",
      targetId: created.id,
      metadata: { name: created.name, kind: created.kind, visibility: created.visibility },
      ip,
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.startsWith("exchange-logo:")) {
      redirect("/exchanges/new?error=logo");
    }
    assertDatabaseReachable(e);
    throw e instanceof Error ? e : new Error(String(e));
  }

  revalidatePath("/exchanges");
  revalidatePath("/admin");
  revalidatePath("/admin/exchanges");
  redirect("/exchanges?created=1");
}

export async function updateExchangeAction(formData: FormData) {
  const user = await requireUser();

  const exchangeId = str(formData.get("exchangeId"));
  if (!exchangeId) {
    redirect("/exchanges?error=forbidden");
  }

  const db = getPrisma();
  const exchange = await db.exchange.findUnique({
    where: { id: exchangeId },
    include: {
      memberships: { where: { userId: user.id }, take: 1 },
    },
  });

  if (!exchange) {
    redirect(`/exchanges/${exchangeId}/edit?error=not-found`);
  }

  const membership = exchange.memberships[0] ?? null;
  if (!canViewExchangeDirectory(exchange, membership, user)) {
    redirect("/exchanges?error=forbidden");
  }
  if (!canAccessOperatorDashboard(user, membership)) {
    redirect("/exchanges?error=forbidden");
  }

  const superUser = isSuperAdmin(user);
  const name = str(formData.get("name"));
  const description = str(formData.get("description")) || null;
  const allowedTypes = parseAllowedItemTypes(formData);
  const eventDateRaw = str(formData.get("eventDate"));
  let eventDate: Date | null = null;
  if (eventDateRaw) {
    const d = new Date(eventDateRaw);
    if (!Number.isNaN(d.getTime())) {
      eventDate = d;
    }
  }

  if (!name) {
    redirect(`/exchanges/${exchangeId}/edit?error=name`);
  }
  if (!hasAtLeastOneAllowedItemType(allowedTypes)) {
    redirect(`/exchanges/${exchangeId}/edit?error=item-types`);
  }

  try {
    if (superUser) {
      const kind = parseKind(str(formData.get("kind")));
      const visibility = parseVisibility(str(formData.get("visibility")));
      await db.$transaction(async (tx) => {
        await tx.exchange.update({
          where: { id: exchangeId },
          data: {
            name,
            description,
            kind,
            visibility,
            eventDate,
            allowCoral: allowedTypes.allowCoral,
            allowFish: allowedTypes.allowFish,
            allowEquipment: allowedTypes.allowEquipment,
            allowItemsForSale: allowedTypes.allowItemsForSale,
          },
        });
        if (kind === ExchangeKind.GROUP) {
          await tx.exchangeMembership.updateMany({
            where: { exchangeId, role: ExchangeMembershipRole.EVENT_MANAGER },
            data: { role: ExchangeMembershipRole.MEMBER },
          });
        }
      });
    } else {
      await db.exchange.update({
        where: { id: exchangeId },
        data: {
          name,
          description,
          eventDate,
          allowCoral: allowedTypes.allowCoral,
          allowFish: allowedTypes.allowFish,
          allowEquipment: allowedTypes.allowEquipment,
          allowItemsForSale: allowedTypes.allowItemsForSale,
        },
      });
    }
    const logo = await processExchangeLogoFromFormData(exchangeId, formData);
    if (logo) {
      await db.exchange.update({
        where: { id: exchangeId },
        data: logo,
      });
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.startsWith("exchange-logo:")) {
      redirect(`/exchanges/${exchangeId}/edit?error=logo`);
    }
    assertDatabaseReachable(e);
    redirect(`/exchanges/${exchangeId}/edit?error=not-found`);
  }

  const ip = await getRequestIp();
  const updated = await db.exchange.findUnique({
    where: { id: exchangeId },
    select: { kind: true, visibility: true },
  });
  await logAdminAudit({
    actorUserId: user.id,
    action: superUser ? "exchange.update" : "exchange.update.operator",
    targetType: "exchange",
    targetId: exchangeId,
    metadata: {
      name,
      kind: updated?.kind,
      visibility: updated?.visibility,
      restricted: !superUser,
    },
    ip,
  });

  revalidatePath("/exchanges");
  revalidatePath(`/exchanges/${exchangeId}`);
  revalidatePath("/explore");
  revalidatePath("/admin");
  revalidatePath("/admin/exchanges");
  revalidatePath("/operator");
  revalidatePath(`/operator/${exchangeId}`);
  if (superUser) {
    redirect(`/exchanges/${exchangeId}?updated=1`);
  }
  redirect(`/operator/${exchangeId}?updated=1`);
}

export async function updateExchangeLogoAction(formData: FormData) {
  const user = await requireUser();
  const exchangeId = str(formData.get("exchangeId"));
  if (!exchangeId) {
    redirect("/exchanges?error=forbidden");
  }

  const exchange = await getPrisma().exchange.findUnique({
    where: { id: exchangeId },
    include: {
      memberships: {
        where: { userId: user.id },
        take: 1,
      },
    },
  });

  if (!exchange) {
    redirect("/exchanges?error=forbidden");
  }

  const membership = exchange.memberships[0] ?? null;
  if (!canEditExchangeLogo(exchange, membership, user)) {
    redirect(`/exchanges/${exchangeId}?error=forbidden`);
  }

  try {
    const logo = await processExchangeLogoFromFormData(exchangeId, formData);
    if (!logo) {
      redirect(`/exchanges/${exchangeId}/edit?error=logo`);
    }
    await getPrisma().exchange.update({
      where: { id: exchangeId },
      data: logo,
    });
  } catch (e: unknown) {
    assertDatabaseReachable(e);
    redirect(`/exchanges/${exchangeId}/edit?error=logo`);
  }

  revalidatePath("/exchanges");
  revalidatePath(`/exchanges/${exchangeId}`);
  revalidatePath(`/exchanges/${exchangeId}/edit`);
  revalidatePath("/explore");
  revalidatePath("/admin");
  revalidatePath("/admin/exchanges");
  revalidatePath("/operator");
  revalidatePath(`/operator/${exchangeId}`);
  redirect(`/exchanges/${exchangeId}?updated=1`);
}

export async function deleteExchangeAction(formData: FormData) {
  const user = await requireUser();

  const exchangeId = str(formData.get("exchangeId"));
  if (!exchangeId) {
    redirect("/exchanges?error=forbidden");
  }

  const exchange = await getPrisma().exchange.findUnique({
    where: { id: exchangeId },
    include: {
      memberships: { where: { userId: user.id }, take: 1 },
    },
  });

  if (!exchange) {
    redirect("/exchanges?error=forbidden");
  }

  const membership = exchange.memberships[0] ?? null;
  const superUser = isSuperAdmin(user);
  const manager = membership?.role === ExchangeMembershipRole.EVENT_MANAGER;
  if (!superUser && !manager) {
    redirect("/exchanges?error=forbidden");
  }

  try {
    await getPrisma().exchange.delete({ where: { id: exchangeId } });
  } catch (e: unknown) {
    assertDatabaseReachable(e);
    redirect("/exchanges?error=forbidden");
  }

  const ip = await getRequestIp();
  await logAdminAudit({
    actorUserId: user.id,
    action: superUser ? "exchange.delete" : "exchange.delete.operator",
    targetType: "exchange",
    targetId: exchangeId,
    ip,
  });

  revalidatePath("/exchanges");
  revalidatePath(`/exchanges/${exchangeId}`);
  revalidatePath("/explore");
  revalidatePath("/admin");
  revalidatePath("/admin/exchanges");
  revalidatePath("/operator");
  revalidatePath(`/operator/${exchangeId}`);
  redirect("/exchanges?deleted=1");
}

export async function joinPublicExchangeFormAction(formData: FormData) {
  const exchangeId = str(formData.get("exchangeId"));
  if (!exchangeId) {
    redirect("/exchanges?error=join-not-found");
  }

  const user = await requireUser();

  const exchange = await getPrisma().exchange.findFirst({
    where: { id: exchangeId, visibility: ExchangeVisibility.PUBLIC },
  });

  if (!exchange) {
    redirect("/exchanges?error=join-not-found");
  }

  await getPrisma().exchangeMembership.upsert({
    where: {
      exchangeId_userId: { exchangeId, userId: user.id },
    },
    create: {
      exchangeId,
      userId: user.id,
      role: ExchangeMembershipRole.MEMBER,
    },
    update: {},
  });

  revalidatePath("/exchanges");
  revalidatePath("/exchanges/browse");
  revalidatePath(`/exchanges/${exchangeId}`);
  redirect(`/exchanges/${exchangeId}?joined=1`);
}

/** Create one invite and send its email (used sequentially from the client with ~11s gaps for provider rate limits). */
export async function createInviteAndSendEmailAction(
  exchangeId: string,
  emailRaw: string,
): Promise<{ ok: true; row: BulkInviteResultRow } | { ok: false; error: string }> {
  const user = await requireUser();
  const normalized = normalizeInviteEmail(emailRaw);

  const exchange = await getPrisma().exchange.findUnique({
    where: { id: exchangeId },
    include: {
      memberships: { where: { userId: user.id } },
    },
  });

  if (!exchange) {
    return { ok: false, error: "Exchange not found." };
  }

  const membership = exchange.memberships[0] ?? null;
  if (!canIssuePrivateInvite(exchange, membership, user)) {
    return { ok: false, error: "You cannot create invites for this exchange." };
  }

  if (!normalized) {
    return {
      ok: true,
      row: { email: "(empty)", error: "Enter a valid email address." },
    };
  }

  if (!normalized.includes("@")) {
    return {
      ok: true,
      row: { email: normalized, error: "Enter a valid email address." },
    };
  }

  const db = getPrisma();
  const now = new Date();
  const pending = await db.exchangeInvite.findFirst({
    where: {
      exchangeId,
      email: normalized,
      usedAt: null,
      expiresAt: { gt: now },
    },
  });
  if (pending) {
    return {
      ok: true,
      row: {
        email: normalized,
        error: "An invite is already pending for this address.",
      },
    };
  }

  const token = makeToken();
  const tokenHash = hashExchangeInviteToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  const created = await db.exchangeInvite.create({
    data: {
      exchangeId,
      email: normalized,
      tokenHash,
      expiresAt,
      invitedById: user.id,
    },
  });

  const origin = await getRequestOrigin();
  const inviteUrl = `${origin}/exchanges/invite/${encodeURIComponent(token)}`;
  const emailDelivery = await sendExchangeInviteEmail({
    to: normalized,
    inviteUrl,
    exchangeName: exchange.name,
  });

  await db.exchangeInvite.update({
    where: { id: created.id },
    data: { lastSentAt: new Date() },
  });

  revalidatePath(`/exchanges/${exchangeId}`);
  revalidatePath(`/exchanges/${exchangeId}/reefers`);
  revalidatePath(`/operator/${exchangeId}`);

  return {
    ok: true,
    row: { email: normalized, inviteUrl, emailDelivery },
  };
}

export type ResendInviteState = { ok: true } | { ok: false; message: string } | null;

/** Resend email for an unused, non-expired private exchange invite (operators / super admins). */
export async function resendExchangeInviteEmailAction(
  _prev: ResendInviteState,
  formData: FormData,
): Promise<ResendInviteState> {
  const inviteId = str(formData.get("inviteId"));
  const exchangeId = str(formData.get("exchangeId"));
  if (!inviteId || !exchangeId) {
    return { ok: false, message: "Missing invite details." };
  }

  const user = await requireUser();
  const db = getPrisma();
  const invite = await db.exchangeInvite.findFirst({
    where: { id: inviteId, exchangeId },
    include: {
      exchange: {
        include: {
          memberships: { where: { userId: user.id } },
        },
      },
    },
  });

  if (!invite) {
    return { ok: false, message: "Invite not found." };
  }

  const membership = invite.exchange.memberships[0] ?? null;
  if (!canIssuePrivateInvite(invite.exchange, membership, user)) {
    return { ok: false, message: "You cannot resend this invite." };
  }

  const now = new Date();
  if (invite.usedAt !== null) {
    return { ok: false, message: "This invite was already used." };
  }
  if (invite.expiresAt <= now) {
    return { ok: false, message: "This invite has expired. Send a new invite from Invites." };
  }

  const token = makeToken();
  const tokenHash = hashExchangeInviteToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

  await db.exchangeInvite.update({
    where: { id: invite.id },
    data: { tokenHash, expiresAt, lastSentAt: new Date() },
  });

  const origin = await getRequestOrigin();
  const inviteUrl = `${origin}/exchanges/invite/${encodeURIComponent(token)}`;
  await sendExchangeInviteEmail({
    to: invite.email,
    inviteUrl,
    exchangeName: invite.exchange.name,
  });

  revalidatePath(`/exchanges/${exchangeId}`);
  revalidatePath(`/exchanges/${exchangeId}/reefers`);
  revalidatePath(`/operator/${exchangeId}`);

  return { ok: true };
}

export async function acceptInviteFormAction(formData: FormData) {
  const token = str(formData.get("token"));
  if (!token) {
    redirect("/exchanges?error=invite-invalid");
  }
  await acceptInviteAction(token);
}

export async function acceptInviteAction(token: string) {
  const user = await requireUser();
  const tokenHash = hashExchangeInviteToken(token);

  const invite = await getPrisma().exchangeInvite.findUnique({
    where: { tokenHash },
    include: { exchange: true },
  });

  if (!invite || invite.usedAt || invite.expiresAt <= new Date()) {
    redirect("/exchanges?error=invite-invalid");
  }

  if (normalizeEmail(user.email) !== normalizeEmail(invite.email)) {
    redirect(`/exchanges/invite/${encodeURIComponent(token)}?error=email-mismatch`);
  }

  const db = getPrisma();
  await db.$transaction([
    db.exchangeMembership.upsert({
      where: {
        exchangeId_userId: { exchangeId: invite.exchangeId, userId: user.id },
      },
      create: {
        exchangeId: invite.exchangeId,
        userId: user.id,
        role: ExchangeMembershipRole.MEMBER,
      },
      update: {},
    }),
    db.exchangeInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    }),
  ]);

  revalidatePath("/exchanges");
  revalidatePath(`/exchanges/${invite.exchangeId}`);
  redirect(`/exchanges/${invite.exchangeId}?joined=invite`);
}

export async function promoteEventManagerFormAction(formData: FormData) {
  const exchangeId = str(formData.get("exchangeId"));
  const memberUserId = str(formData.get("memberUserId"));
  if (!exchangeId || !memberUserId) {
    redirect("/exchanges?error=forbidden");
  }

  const user = await requireUser();

  const base = eventManagerActionRedirectBase(exchangeId, formData);

  const exchange = await getPrisma().exchange.findUnique({ where: { id: exchangeId } });
  if (!exchange || !canPromoteEventManager(exchange, user)) {
    redirect(`${base}?error=forbidden`);
  }

  const target = await getPrisma().exchangeMembership.findFirst({
    where: { exchangeId, userId: memberUserId },
  });

  if (!target || target.role !== ExchangeMembershipRole.MEMBER) {
    redirect(`${base}?error=promote-invalid`);
  }

  await getPrisma().exchangeMembership.update({
    where: { id: target.id },
    data: { role: ExchangeMembershipRole.EVENT_MANAGER },
  });

  revalidatePath(`/exchanges/${exchangeId}`);
  revalidatePath(`/exchanges/${exchangeId}/reefers`);
  revalidatePath(`/operator/${exchangeId}`);
  redirect(`${base}?promoted=1`);
}

export async function demoteEventManagerFormAction(formData: FormData) {
  const exchangeId = str(formData.get("exchangeId"));
  const managerUserId = str(formData.get("managerUserId"));
  if (!exchangeId || !managerUserId) {
    redirect("/exchanges?error=forbidden");
  }

  const user = await requireUser();
  const base = eventManagerActionRedirectBase(exchangeId, formData);

  if (!isSuperAdmin(user)) {
    redirect(`${base}?error=forbidden`);
  }

  const exchange = await getPrisma().exchange.findUnique({ where: { id: exchangeId } });
  if (!exchange || exchange.kind !== ExchangeKind.EVENT) {
    redirect(`${base}?error=demote-invalid`);
  }

  const target = await getPrisma().exchangeMembership.findFirst({
    where: { exchangeId, userId: managerUserId },
  });

  if (!target || target.role !== ExchangeMembershipRole.EVENT_MANAGER) {
    redirect(`${base}?error=demote-invalid`);
  }

  await getPrisma().exchangeMembership.update({
    where: { id: target.id },
    data: { role: ExchangeMembershipRole.MEMBER },
  });

  const ip = await getRequestIp();
  await logAdminAudit({
    actorUserId: user.id,
    action: "exchange.demote_event_manager",
    targetType: "exchange",
    targetId: exchangeId,
    metadata: { managerUserId },
    ip,
  });

  revalidatePath(`/exchanges/${exchangeId}`);
  revalidatePath(`/exchanges/${exchangeId}/reefers`);
  revalidatePath(`/operator/${exchangeId}`);
  redirect(`${base}?demoted=1`);
}
