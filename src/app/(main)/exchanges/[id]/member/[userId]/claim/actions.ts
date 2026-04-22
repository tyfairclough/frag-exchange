"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { BusinessAccountOwnership, UserPostingRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { hasRecentBusinessClaim } from "@/lib/business-claim";
import { getPrisma } from "@/lib/db";
import { sendBusinessClaimAdminNotifications } from "@/lib/send-business-claim-admin-email";
import { canViewExchangeDirectory } from "@/lib/super-admin";

function str(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}

function notifyEmailSiteUrl(): string | null {
  const a = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "").trim();
  if (a) {
    return a;
  }
  const b = process.env.APP_BASE_URL?.replace(/\/$/, "").trim();
  return b || null;
}

const FULL_NAME_MAX = 160;
const BUSINESS_EMAIL_MAX = 255;

function emailLooksValid(s: string) {
  return s.length <= BUSINESS_EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function submitBusinessClaimAction(formData: FormData) {
  const viewer = await requireUser();
  const exchangeId = str(formData.get("exchangeId"));
  const memberUserId = str(formData.get("memberUserId"));
  const fullName = str(formData.get("fullName"));
  const businessEmailRaw = str(formData.get("businessEmail"));
  const businessEmail = businessEmailRaw.toLowerCase();

  if (!exchangeId || !memberUserId) {
    redirect("/exchanges");
  }

  const baseClaim = `/exchanges/${encodeURIComponent(exchangeId)}/member/${encodeURIComponent(memberUserId)}/claim`;
  const withQuery = (code: string) => `${baseClaim}?error=${encodeURIComponent(code)}`;

  if (memberUserId !== viewer.id) {
    redirect(withQuery("forbidden"));
  }

  const db = getPrisma();

  const targetUser = await db.user.findUnique({
    where: { id: memberUserId },
    select: {
      id: true,
      email: true,
      alias: true,
      postingRole: true,
      businessAccountOwnership: true,
    },
  });

  if (!targetUser) {
    redirect(withQuery("invalid"));
  }

  const isCommercial =
    targetUser.postingRole === UserPostingRole.LFS ||
    targetUser.postingRole === UserPostingRole.ONLINE_RETAILER;

  if (!isCommercial || targetUser.businessAccountOwnership !== BusinessAccountOwnership.UNCLAIMED) {
    redirect(`/exchanges/${encodeURIComponent(exchangeId)}/member/${encodeURIComponent(memberUserId)}`);
  }

  const exchange = await db.exchange.findUnique({
    where: { id: exchangeId },
    include: {
      memberships: {
        where: { userId: { in: [viewer.id, memberUserId] } },
      },
    },
  });

  if (!exchange) {
    redirect(withQuery("invalid"));
  }

  const viewerMembership = exchange.memberships.find((m) => m.userId === viewer.id) ?? null;
  const ownerMembership = exchange.memberships.find((m) => m.userId === memberUserId) ?? null;

  if (!canViewExchangeDirectory(exchange, viewerMembership, viewer) || !viewerMembership || !ownerMembership) {
    redirect(withQuery("forbidden"));
  }

  if (await hasRecentBusinessClaim(db, memberUserId)) {
    redirect(withQuery("recent"));
  }

  if (!fullName || fullName.length > FULL_NAME_MAX) {
    redirect(withQuery("invalid"));
  }

  if (!businessEmail || !emailLooksValid(businessEmail)) {
    redirect(withQuery("invalid"));
  }

  await db.businessClaim.create({
    data: {
      userId: memberUserId,
      exchangeId,
      fullName,
      businessEmail,
    },
  });

  const site = notifyEmailSiteUrl();
  const accountLabel = (targetUser.alias?.trim() || targetUser.email).trim();
  const exchangeLabel = `${exchange.name} (${exchange.id})`;

  if (site) {
    const adminClaimsUrl = `${site}/admin/business-claims`;
    after(async () => {
      try {
        await sendBusinessClaimAdminNotifications(getPrisma(), {
          fullName,
          businessEmail,
          accountLabel,
          exchangeLabel,
          adminClaimsUrl,
        });
      } catch (e) {
        console.error("[business-claim] admin notify failed", e);
      }
    });
  } else if (process.env.NODE_ENV === "development") {
    console.warn("[business-claim] skipped admin notify: set NEXT_PUBLIC_APP_URL or APP_BASE_URL");
  }

  revalidatePath(`/exchanges/${exchangeId}/member/${memberUserId}`);
  revalidatePath(`/exchanges/${exchangeId}/member/${memberUserId}/claim`);
  redirect(`${baseClaim}?submitted=1`);
}
