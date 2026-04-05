"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserGlobalRole } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { logAdminAudit } from "@/lib/admin-audit";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { getRequestIp } from "@/lib/rate-limit";

function str(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
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
