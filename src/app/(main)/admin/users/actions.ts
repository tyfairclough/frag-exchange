"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { BusinessAccountOwnership, UserGlobalRole, UserPostingRole } from "@/generated/prisma/enums";
import { assertDatabaseReachable, getPrisma } from "@/lib/db";
import { adminDeleteUserAndCollectNotifyRecipients } from "@/lib/admin-delete-user";
import { logAdminAudit } from "@/lib/admin-audit";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { getRequestIp } from "@/lib/rate-limit";
import { sendMemberRemovedTradeCancelledEmailsThrottled } from "@/lib/send-member-removed-trade-cancelled-emails";
import { getRequestOrigin } from "@/lib/request-origin";
import { createMagicLink } from "@/lib/auth";
import { sendMagicLinkEmail } from "@/lib/send-magic-link-email";
import {
  MAX_USER_ALIAS_LENGTH,
  buildAliasCandidateFromWordList,
  fetchAliasWordStrings,
  otherUserHasAlias,
} from "@/lib/suggested-alias";

function str(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function notifyEmailSiteUrl(): string | null {
  const a = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "").trim();
  if (a) {
    return a;
  }
  const b = process.env.APP_BASE_URL?.replace(/\/$/, "").trim();
  return b || null;
}

const AVATAR_CHOICES = ["🐠", "🪸", "🐙", "🦀", "🐡", "🐟", "🦐", "🪼"] as const;

function randomAvatarEmoji() {
  return AVATAR_CHOICES[Math.floor(Math.random() * AVATAR_CHOICES.length)] ?? "🐠";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parsePostingRoleInput(raw: string): UserPostingRole | null | "invalid" {
  if (raw === "" || raw === "NONE") {
    return null;
  }
  if (raw === UserPostingRole.LFS || raw === UserPostingRole.ONLINE_RETAILER) {
    return raw;
  }
  return "invalid";
}

async function resolveAlias({
  db,
  explicitAlias,
  existingUserId,
  existingAlias,
}: {
  db: ReturnType<typeof getPrisma>;
  explicitAlias: string;
  existingUserId: string | null;
  existingAlias: string | null;
}) {
  const candidate = explicitAlias.slice(0, MAX_USER_ALIAS_LENGTH);
  if (candidate) {
    const taken = await db.user.findFirst({
      where: {
        alias: candidate,
        ...(existingUserId ? { NOT: { id: existingUserId } } : {}),
      },
      select: { id: true },
    });
    if (taken) {
      return { ok: false as const, error: "alias-taken" };
    }
    return { ok: true as const, alias: candidate };
  }

  if (existingAlias) {
    return { ok: true as const, alias: existingAlias };
  }

  const words = await fetchAliasWordStrings(db);
  if (words.length < 3) {
    return { ok: false as const, error: "alias-words" };
  }

  let alias = "";
  let guard = 0;
  while (!alias && guard < 30) {
    const generated = buildAliasCandidateFromWordList(words).slice(0, MAX_USER_ALIAS_LENGTH);
    const taken = await otherUserHasAlias(db, generated, existingUserId ?? "");
    if (!taken) {
      alias = generated;
    }
    guard += 1;
  }

  if (!alias) {
    return { ok: false as const, error: "alias-words" };
  }
  return { ok: true as const, alias };
}

export async function createUserAction(formData: FormData) {
  const actor = await requireSuperAdmin();
  const emailRaw = str(formData.get("email"));
  const aliasRaw = str(formData.get("alias"));
  const globalRoleRaw = str(formData.get("globalRole"));
  const postingRaw = str(formData.get("postingRole"));
  const exchangeIds = formData
    .getAll("exchangeIds")
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);

  const email = normalizeEmail(emailRaw);
  if (!email || !email.includes("@")) {
    redirect("/admin/users?error=invalid-email");
  }
  if (aliasRaw.length > MAX_USER_ALIAS_LENGTH) {
    redirect("/admin/users?error=alias-length");
  }
  if (globalRoleRaw !== UserGlobalRole.MEMBER && globalRoleRaw !== UserGlobalRole.SUPER_ADMIN) {
    redirect("/admin/users?error=invalid");
  }
  const postingRole = parsePostingRoleInput(postingRaw);
  if (postingRole === "invalid") {
    redirect("/admin/users?error=invalid");
  }

  const db = getPrisma();
  const uniqueExchangeIds = [...new Set(exchangeIds)];
  if (uniqueExchangeIds.length > 0) {
    const exchangeCount = await db.exchange.count({
      where: { id: { in: uniqueExchangeIds } },
    });
    if (exchangeCount !== uniqueExchangeIds.length) {
      redirect("/admin/users?error=exchange-invalid");
    }
  }

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true, alias: true, avatarEmoji: true },
  });

  const aliasResult = await resolveAlias({
    db,
    explicitAlias: aliasRaw,
    existingUserId: existing?.id ?? null,
    existingAlias: existing?.alias ?? null,
  });
  if (!aliasResult.ok) {
    redirect(`/admin/users?error=${aliasResult.error}`);
  }

  const businessAccountOwnership: BusinessAccountOwnership =
    postingRole === UserPostingRole.LFS || postingRole === UserPostingRole.ONLINE_RETAILER
      ? BusinessAccountOwnership.UNCLAIMED
      : BusinessAccountOwnership.CLAIMED;

  const assignedAvatar = existing?.avatarEmoji || randomAvatarEmoji();

  const savedUser = await db.$transaction(async (tx) => {
    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            alias: aliasResult.alias,
            globalRole: globalRoleRaw,
            postingRole,
            businessAccountOwnership,
            avatarEmoji: existing.avatarEmoji ?? assignedAvatar,
          },
          select: { id: true, email: true },
        })
      : await tx.user.create({
          data: {
            email,
            alias: aliasResult.alias,
            globalRole: globalRoleRaw,
            postingRole,
            businessAccountOwnership,
            avatarEmoji: assignedAvatar,
          },
          select: { id: true, email: true },
        });

    for (const exchangeId of uniqueExchangeIds) {
      await tx.exchangeMembership.upsert({
        where: {
          exchangeId_userId: {
            exchangeId,
            userId: user.id,
          },
        },
        create: {
          exchangeId,
          userId: user.id,
        },
        update: {},
      });
    }
    return user;
  });

  const { token } = await createMagicLink(savedUser.email);
  const origin = await getRequestOrigin();
  const verifyUrl = `${origin}/auth/verify?token=${encodeURIComponent(token)}`;
  const inviteDelivery = await sendMagicLinkEmail({
    to: savedUser.email,
    verifyUrl,
  });

  const inviteStatus = inviteDelivery.ok
    ? inviteDelivery.via === "mailtrap"
      ? "sent"
      : "skipped"
    : "failed";

  const ip = await getRequestIp();
  await logAdminAudit({
    actorUserId: actor.id,
    action: "user.create_or_assign",
    targetType: "user",
    targetId: savedUser.id,
    metadata: {
      email: savedUser.email,
      existingUser: Boolean(existing),
      globalRole: globalRoleRaw,
      postingRole,
      exchangeIds: uniqueExchangeIds,
      inviteStatus,
    },
    ip,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/operator");
  revalidatePath("/exchanges");
  redirect(`/admin/users?created=1&invite=${inviteStatus}`);
}

export async function deleteUserAction(formData: FormData) {
  const actor = await requireSuperAdmin();
  const userId = str(formData.get("userId"));

  if (!userId) {
    redirect("/admin/users?error=invalid");
  }

  if (userId === actor.id) {
    redirect("/admin/users?error=delete-self");
  }

  const db = getPrisma();
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, globalRole: true, email: true },
  });

  if (!target) {
    redirect("/admin/users?error=not-found");
  }

  if (target.globalRole === UserGlobalRole.SUPER_ADMIN) {
    const superAdminCount = await db.user.count({
      where: { globalRole: UserGlobalRole.SUPER_ADMIN },
    });
    if (superAdminCount <= 1) {
      redirect("/admin/users?error=last-admin");
    }
  }

  let notifyRecipients: Awaited<ReturnType<typeof adminDeleteUserAndCollectNotifyRecipients>>;
  try {
    notifyRecipients = await adminDeleteUserAndCollectNotifyRecipients(db, {
      targetUserId: userId,
      actorUserId: actor.id,
    });
  } catch (e: unknown) {
    assertDatabaseReachable(e);
    console.error("[admin-delete-user] transaction failed", e);
    redirect("/admin/users?error=delete-failed");
  }

  const siteUrl = notifyEmailSiteUrl();
  if (notifyRecipients.length > 0 && siteUrl) {
    after(async () => {
      try {
        await sendMemberRemovedTradeCancelledEmailsThrottled(notifyRecipients, siteUrl);
      } catch (err) {
        console.error("[admin-delete-user] notify emails failed", err);
      }
    });
  } else if (notifyRecipients.length > 0 && !siteUrl && process.env.NODE_ENV === "development") {
    console.warn(
      "[admin-delete-user] skipped trade-cancel emails: set NEXT_PUBLIC_APP_URL or APP_BASE_URL",
    );
  }

  const ip = await getRequestIp();
  await logAdminAudit({
    actorUserId: actor.id,
    action: "user.delete",
    targetType: "user",
    targetId: userId,
    metadata: { email: target.email },
    ip,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/exchanges");
  revalidatePath("/explore");
  revalidatePath("/admin/exchanges");
  revalidatePath("/operator");
  revalidatePath("/my-items");
  redirect("/admin/users?deleted=1");
}

export async function updateUserGlobalRoleAction(formData: FormData) {
  const actor = await requireSuperAdmin();
  const userId = str(formData.get("userId"));
  const roleRaw = str(formData.get("globalRole"));

  if (!userId || (roleRaw !== UserGlobalRole.MEMBER && roleRaw !== UserGlobalRole.SUPER_ADMIN)) {
    redirect("/admin/users?error=invalid");
  }

  const db = getPrisma();
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, globalRole: true, email: true },
  });

  if (!target) {
    redirect("/admin/users?error=not-found");
  }

  if (roleRaw === UserGlobalRole.MEMBER && target.globalRole === UserGlobalRole.SUPER_ADMIN) {
    const superAdminCount = await db.user.count({
      where: { globalRole: UserGlobalRole.SUPER_ADMIN },
    });
    if (superAdminCount <= 1) {
      redirect("/admin/users?error=last-admin");
    }
  }

  if (target.globalRole === roleRaw) {
    redirect("/admin/users");
  }

  await db.user.update({
    where: { id: userId },
    data: { globalRole: roleRaw },
  });

  const ip = await getRequestIp();
  await logAdminAudit({
    actorUserId: actor.id,
    action: "user.global_role.update",
    targetType: "user",
    targetId: userId,
    metadata: { email: target.email, from: target.globalRole, to: roleRaw },
    ip,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  redirect("/admin/users?updated=1");
}

export async function updateUserPostingRoleAction(formData: FormData) {
  const actor = await requireSuperAdmin();
  const userId = str(formData.get("userId"));
  const postingRaw = str(formData.get("postingRole"));

  if (!userId) {
    redirect("/admin/users?error=invalid");
  }

  const nextRole = parsePostingRoleInput(postingRaw);
  if (nextRole === "invalid") {
    redirect("/admin/users?error=invalid");
  }

  const db = getPrisma();
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, postingRole: true, email: true },
  });

  if (!target) {
    redirect("/admin/users?error=not-found");
  }

  if (target.postingRole === nextRole) {
    redirect("/admin/users");
  }

  const businessAccountOwnership: BusinessAccountOwnership =
    nextRole === UserPostingRole.LFS || nextRole === UserPostingRole.ONLINE_RETAILER
      ? BusinessAccountOwnership.UNCLAIMED
      : BusinessAccountOwnership.CLAIMED;

  await db.user.update({
    where: { id: userId },
    data: { postingRole: nextRole, businessAccountOwnership },
  });

  const ip = await getRequestIp();
  await logAdminAudit({
    actorUserId: actor.id,
    action: "user.posting_role.update",
    targetType: "user",
    targetId: userId,
    metadata: {
      email: target.email,
      from: target.postingRole,
      to: nextRole,
      businessAccountOwnership,
    },
    ip,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  redirect("/admin/users?updated=1");
}

export async function updateUserBusinessOwnershipAction(formData: FormData) {
  const actor = await requireSuperAdmin();
  const userId = str(formData.get("userId"));
  const nextRaw = str(formData.get("businessAccountOwnership"));

  if (!userId || nextRaw !== BusinessAccountOwnership.CLAIMED) {
    redirect("/admin/users?error=invalid");
  }

  const db = getPrisma();
  const target = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      postingRole: true,
      businessAccountOwnership: true,
    },
  });

  if (!target) {
    redirect("/admin/users?error=not-found");
  }

  if (
    target.postingRole !== UserPostingRole.LFS &&
    target.postingRole !== UserPostingRole.ONLINE_RETAILER
  ) {
    redirect("/admin/users?error=invalid");
  }

  if (target.businessAccountOwnership === BusinessAccountOwnership.CLAIMED) {
    redirect("/admin/users");
  }

  await db.user.update({
    where: { id: userId },
    data: { businessAccountOwnership: BusinessAccountOwnership.CLAIMED },
  });

  const ip = await getRequestIp();
  await logAdminAudit({
    actorUserId: actor.id,
    action: "user.business_account_ownership.update",
    targetType: "user",
    targetId: userId,
    metadata: { email: target.email, to: BusinessAccountOwnership.CLAIMED },
    ip,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/business-claims");
  redirect("/admin/users?updated=1");
}
