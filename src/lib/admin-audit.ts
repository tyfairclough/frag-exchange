import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

export type AdminAuditPayload = {
  actorUserId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
};

/**
 * Records super-admin (platform) actions. Does not throw — failures are logged only.
 */
export async function logAdminAudit(payload: AdminAuditPayload): Promise<void> {
  try {
    await getPrisma().adminAuditLog.create({
      data: {
        actorUserId: payload.actorUserId,
        action: payload.action,
        targetType: payload.targetType ?? null,
        targetId: payload.targetId ?? null,
        metadata: (payload.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ip: payload.ip?.slice(0, 80) ?? null,
      },
    });
  } catch (e) {
    console.error("[admin-audit] failed to write log", payload.action, e);
  }
}
