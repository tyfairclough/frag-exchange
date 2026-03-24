import {
  ExchangeKind,
  ExchangeMembershipRole,
  ExchangeVisibility,
  UserGlobalRole,
} from "@/generated/prisma/enums";
import type { Exchange, ExchangeMembership } from "@/generated/prisma/client";

export function parseSuperAdminEmails(): string[] {
  return (process.env.FRAG_SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdmin(user: { email: string; globalRole: UserGlobalRole }): boolean {
  if (user.globalRole === UserGlobalRole.SUPER_ADMIN) {
    return true;
  }
  return parseSuperAdminEmails().includes(user.email.trim().toLowerCase());
}

export function canCreateExchange(user: { email: string; globalRole: UserGlobalRole }): boolean {
  return isSuperAdmin(user);
}

export function canViewExchangeDirectory(
  exchange: Pick<Exchange, "visibility">,
  membership: ExchangeMembership | null,
  user: { email: string; globalRole: UserGlobalRole },
): boolean {
  if (exchange.visibility === ExchangeVisibility.PUBLIC) {
    return true;
  }
  if (isSuperAdmin(user)) {
    return true;
  }
  return membership !== null;
}

export function canSeeMemberRoster(
  exchange: Pick<Exchange, "kind">,
  membership: ExchangeMembership | null,
  user: { email: string; globalRole: UserGlobalRole },
): boolean {
  if (isSuperAdmin(user)) {
    return true;
  }
  if (exchange.kind !== ExchangeKind.EVENT) {
    return false;
  }
  return membership?.role === ExchangeMembershipRole.EVENT_MANAGER;
}

export function canIssuePrivateInvite(
  exchange: Pick<Exchange, "visibility" | "kind">,
  membership: ExchangeMembership | null,
  user: { email: string; globalRole: UserGlobalRole },
): boolean {
  if (exchange.visibility !== ExchangeVisibility.PRIVATE) {
    return false;
  }
  if (isSuperAdmin(user)) {
    return true;
  }
  if (exchange.kind === ExchangeKind.EVENT && membership?.role === ExchangeMembershipRole.EVENT_MANAGER) {
    return true;
  }
  return false;
}

export function canPromoteEventManager(
  exchange: Pick<Exchange, "kind">,
  user: { email: string; globalRole: UserGlobalRole },
): boolean {
  return isSuperAdmin(user) && exchange.kind === ExchangeKind.EVENT;
}

/** Event managers and super admins: check-in desk and reconciliation for EVENT exchanges. */
export function canManageEventDesk(
  exchange: Pick<Exchange, "kind">,
  membership: ExchangeMembership | null,
  user: { email: string; globalRole: UserGlobalRole },
): boolean {
  if (exchange.kind !== ExchangeKind.EVENT) {
    return false;
  }
  if (isSuperAdmin(user)) {
    return true;
  }
  return membership?.role === ExchangeMembershipRole.EVENT_MANAGER;
}
