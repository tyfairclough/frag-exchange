"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdminAudit } from "@/lib/admin-audit";
import { getPrisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { getRequestIp } from "@/lib/rate-limit";
import { normalizeAliasWordInput, validateAliasGeneratorWord } from "@/lib/suggested-alias";

function str(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function createAliasWordAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const raw = str(formData.get("word"));
  const err = validateAliasGeneratorWord(raw);
  if (err) {
    redirect(`/me/admin/alias-words?error=${encodeURIComponent(err)}`);
  }
  const word = normalizeAliasWordInput(raw);
  const ip = await getRequestIp();

  try {
    const created = await getPrisma().aliasGeneratorWord.create({
      data: { word },
      select: { id: true },
    });
    await logAdminAudit({
      actorUserId: admin.id,
      action: "alias_word.create",
      targetType: "AliasGeneratorWord",
      targetId: created.id,
      metadata: { word },
      ip,
    });
  } catch {
    redirect("/me/admin/alias-words?error=duplicate");
  }

  revalidatePath("/me/admin/alias-words");
  revalidatePath("/onboarding");
  redirect("/me/admin/alias-words");
}

export async function updateAliasWordAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = str(formData.get("id"));
  const raw = str(formData.get("word"));
  if (!id) {
    redirect("/me/admin/alias-words?error=missing");
  }
  const err = validateAliasGeneratorWord(raw);
  if (err) {
    redirect(`/me/admin/alias-words?error=${encodeURIComponent(err)}`);
  }
  const word = normalizeAliasWordInput(raw);
  const ip = await getRequestIp();

  try {
    await getPrisma().aliasGeneratorWord.update({
      where: { id },
      data: { word },
    });
    await logAdminAudit({
      actorUserId: admin.id,
      action: "alias_word.update",
      targetType: "AliasGeneratorWord",
      targetId: id,
      metadata: { word },
      ip,
    });
  } catch {
    redirect("/me/admin/alias-words?error=duplicate");
  }

  revalidatePath("/me/admin/alias-words");
  revalidatePath("/onboarding");
  redirect("/me/admin/alias-words");
}

export async function deleteAliasWordAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const id = str(formData.get("id"));
  if (!id) {
    redirect("/me/admin/alias-words?error=missing");
  }
  const ip = await getRequestIp();

  await getPrisma().aliasGeneratorWord.delete({
    where: { id },
  });
  await logAdminAudit({
    actorUserId: admin.id,
    action: "alias_word.delete",
    targetType: "AliasGeneratorWord",
    targetId: id,
    ip,
  });

  revalidatePath("/me/admin/alias-words");
  revalidatePath("/onboarding");
  redirect("/me/admin/alias-words");
}
