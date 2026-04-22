"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AI_SYSTEM_PROMPT_KEYS,
  AI_SYSTEM_PROMPT_MAX_CHARS,
  type AiSystemPromptKey,
  getAiSystemPromptDefault,
} from "@/lib/ai-system-prompt-registry";
import { logAdminAudit } from "@/lib/admin-audit";
import { getPrisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { getRequestIp } from "@/lib/rate-limit";

function isAiSystemPromptKey(value: string): value is AiSystemPromptKey {
  return (AI_SYSTEM_PROMPT_KEYS as readonly string[]).includes(value);
}

export async function saveAllAiPromptsAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const ip = await getRequestIp();
  const savedNonDefault: string[] = [];

  const entries: { key: AiSystemPromptKey; content: string }[] = [];
  for (const key of AI_SYSTEM_PROMPT_KEYS) {
    const raw = formData.get(key);
    const content = typeof raw === "string" ? raw : "";
    if (!content.trim()) {
      redirect(
        `/admin/ai-prompts?error=${encodeURIComponent(`Prompt "${key}" cannot be empty.`)}`,
      );
    }
    if (content.length > AI_SYSTEM_PROMPT_MAX_CHARS) {
      redirect(
        `/admin/ai-prompts?error=${encodeURIComponent(
          `Prompt "${key}" exceeds ${AI_SYSTEM_PROMPT_MAX_CHARS.toLocaleString()} characters.`,
        )}`,
      );
    }
    entries.push({ key, content });
  }

  await getPrisma().$transaction(async (tx) => {
    for (const { key, content } of entries) {
      const defaultText = getAiSystemPromptDefault(key);
      if (content === defaultText) {
        await tx.aiSystemPrompt.deleteMany({ where: { key } });
      } else {
        await tx.aiSystemPrompt.upsert({
          where: { key },
          create: { key, content },
          update: { content },
        });
        savedNonDefault.push(key);
      }
    }
  });

  await logAdminAudit({
    actorUserId: admin.id,
    action: "ai_prompt.update",
    targetType: "AiSystemPrompt",
    metadata: { keys: savedNonDefault },
    ip,
  });

  revalidatePath("/admin/ai-prompts");
  redirect("/admin/ai-prompts?saved=1");
}

export async function resetAiSystemPromptAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const ip = await getRequestIp();
  const keyRaw = formData.get("key");
  const key = typeof keyRaw === "string" ? keyRaw.trim() : "";
  if (!key || !isAiSystemPromptKey(key)) {
    redirect("/admin/ai-prompts?error=invalid");
  }

  await getPrisma().aiSystemPrompt.deleteMany({ where: { key } });

  await logAdminAudit({
    actorUserId: admin.id,
    action: "ai_prompt.reset",
    targetType: "AiSystemPrompt",
    targetId: key,
    ip,
  });

  revalidatePath("/admin/ai-prompts");
  redirect("/admin/ai-prompts?reset=1");
}
