"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ExchangeKind,
  ExchangeMembershipRole,
  ExchangeVisibility,
} from "@/generated/prisma/enums";
import { assertMysqlReachable, getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { getRequestOrigin } from "@/lib/request-origin";
import {
  canEditExchangeLogo,
  canIssuePrivateInvite,
  canPromoteEventManager,
  isSuperAdmin,
} from "@/lib/super-admin";
import { logAdminAudit } from "@/lib/admin-audit";
import { getRequestIp } from "@/lib/rate-limit";
import { saveExchangeLogoToPublic, validateExchangeLogoUpload } from "@/lib/exchange-logo-upload";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function makeToken() {
  return randomBytes(32).toString("hex");
}

function str(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

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
  const eventDateRaw = str(formData.get("eventDate"));
  let eventDate: Date | null = null;
  if (eventDateRaw) {
    const d = new Date(eventDateRaw);
    if (!Number.isNaN(d.getTime())) {
      eventDate = d;
    }
  }

  if (!name) {
    redirect("/exchanges/new?error=name");
  }

  try {
    const created = await getPrisma().exchange.create({
      data: {
        name,
        description,
        kind,
        visibility,
        eventDate,
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
    assertMysqlReachable(e);
    throw e instanceof Error ? e : new Error(String(e));
  }

  revalidatePath("/exchanges");
  redirect("/exchanges?created=1");
}

export async function updateExchangeAction(formData: FormData) {
  const admin = await requireSuperAdmin();

  const exchangeId = str(formData.get("exchangeId"));
  if (!exchangeId) {
    redirect("/exchanges?error=forbidden");
  }

  const name = str(formData.get("name"));
  const description = str(formData.get("description")) || null;
  const kind = parseKind(str(formData.get("kind")));
  const visibility = parseVisibility(str(formData.get("visibility")));
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

  const db = getPrisma();
  try {
    await db.$transaction(async (tx) => {
      await tx.exchange.update({
        where: { id: exchangeId },
        data: {
          name,
          description,
          kind,
          visibility,
          eventDate,
        },
      });
      if (kind === ExchangeKind.GROUP) {
        await tx.exchangeMembership.updateMany({
          where: { exchangeId, role: ExchangeMembershipRole.EVENT_MANAGER },
          data: { role: ExchangeMembershipRole.MEMBER },
        });
      }
    });
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
    assertMysqlReachable(e);
    redirect(`/exchanges/${exchangeId}/edit?error=not-found`);
  }

  const ip = await getRequestIp();
  await logAdminAudit({
    actorUserId: admin.id,
    action: "exchange.update",
    targetType: "exchange",
    targetId: exchangeId,
    metadata: { name, kind, visibility },
    ip,
  });

  revalidatePath("/exchanges");
  revalidatePath(`/exchanges/${exchangeId}`);
  revalidatePath("/explore");
  redirect(`/exchanges/${exchangeId}?updated=1`);
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
      redirect(`/exchanges/${exchangeId}?error=logo`);
    }
    await getPrisma().exchange.update({
      where: { id: exchangeId },
      data: logo,
    });
  } catch (e: unknown) {
    assertMysqlReachable(e);
    redirect(`/exchanges/${exchangeId}?error=logo`);
  }

  revalidatePath("/exchanges");
  revalidatePath(`/exchanges/${exchangeId}`);
  revalidatePath(`/exchanges/${exchangeId}/edit`);
  revalidatePath("/explore");
  redirect(`/exchanges/${exchangeId}?updated=1`);
}

export async function deleteExchangeAction(formData: FormData) {
  const admin = await requireSuperAdmin();

  const exchangeId = str(formData.get("exchangeId"));
  if (!exchangeId) {
    redirect("/exchanges?error=forbidden");
  }

  try {
    await getPrisma().exchange.delete({ where: { id: exchangeId } });
  } catch (e: unknown) {
    assertMysqlReachable(e);
    redirect("/exchanges?error=forbidden");
  }

  const ip = await getRequestIp();
  await logAdminAudit({
    actorUserId: admin.id,
    action: "exchange.delete",
    targetType: "exchange",
    targetId: exchangeId,
    ip,
  });

  revalidatePath("/exchanges");
  revalidatePath(`/exchanges/${exchangeId}`);
  revalidatePath("/explore");
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

export async function createInviteAction(
  exchangeId: string,
  email: string,
): Promise<{ ok: true; inviteUrl: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

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

  const token = makeToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

  await getPrisma().exchangeInvite.create({
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

  revalidatePath(`/exchanges/${exchangeId}`);
  return { ok: true, inviteUrl };
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
  const tokenHash = hashToken(token);

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

  const exchange = await getPrisma().exchange.findUnique({ where: { id: exchangeId } });
  if (!exchange || !canPromoteEventManager(exchange, user)) {
    redirect(`/exchanges/${exchangeId}?error=forbidden`);
  }

  const target = await getPrisma().exchangeMembership.findFirst({
    where: { exchangeId, userId: memberUserId },
  });

  if (!target || target.role !== ExchangeMembershipRole.MEMBER) {
    redirect(`/exchanges/${exchangeId}?error=promote-invalid`);
  }

  await getPrisma().exchangeMembership.update({
    where: { id: target.id },
    data: { role: ExchangeMembershipRole.EVENT_MANAGER },
  });

  revalidatePath(`/exchanges/${exchangeId}`);
  redirect(`/exchanges/${exchangeId}?promoted=1`);
}

export async function demoteEventManagerFormAction(formData: FormData) {
  const exchangeId = str(formData.get("exchangeId"));
  const managerUserId = str(formData.get("managerUserId"));
  if (!exchangeId || !managerUserId) {
    redirect("/exchanges?error=forbidden");
  }

  const user = await requireUser();
  if (!isSuperAdmin(user)) {
    redirect(`/exchanges/${exchangeId}?error=forbidden`);
  }

  const exchange = await getPrisma().exchange.findUnique({ where: { id: exchangeId } });
  if (!exchange || exchange.kind !== ExchangeKind.EVENT) {
    redirect(`/exchanges/${exchangeId}?error=demote-invalid`);
  }

  const target = await getPrisma().exchangeMembership.findFirst({
    where: { exchangeId, userId: managerUserId },
  });

  if (!target || target.role !== ExchangeMembershipRole.EVENT_MANAGER) {
    redirect(`/exchanges/${exchangeId}?error=demote-invalid`);
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
  redirect(`/exchanges/${exchangeId}?demoted=1`);
}
