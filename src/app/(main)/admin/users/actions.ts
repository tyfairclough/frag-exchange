"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { UserGlobalRole } from "@/generated/prisma/enums";
import { assertDatabaseReachable, getPrisma } from "@/lib/db";
import { adminDeleteUserAndCollectNotifyRecipients } from "@/lib/admin-delete-user";
import { logAdminAudit } from "@/lib/admin-audit";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { getRequestIp } from "@/lib/rate-limit";
import { sendMemberRemovedTradeCancelledEmailsThrottled } from "@/lib/send-member-removed-trade-cancelled-emails";

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
