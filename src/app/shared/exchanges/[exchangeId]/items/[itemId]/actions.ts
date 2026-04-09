"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ExchangeMembershipRole, ExchangeVisibility } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

function str(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function joinExchangeAndStartTradeAction(formData: FormData) {
  const exchangeId = str(formData.get("exchangeId"));
  const itemId = str(formData.get("itemId"));
  const ownerUserId = str(formData.get("ownerUserId"));
  if (!exchangeId || !itemId || !ownerUserId) {
    redirect("/exchanges?error=join-not-found");
  }

  const user = await requireUser();
  const exchange = await getPrisma().exchange.findFirst({
    where: { id: exchangeId, visibility: ExchangeVisibility.PUBLIC },
  });
  if (!exchange) {
    redirect(`/shared/exchanges/${encodeURIComponent(exchangeId)}/items/${encodeURIComponent(itemId)}`);
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
  redirect(`/exchanges/${encodeURIComponent(exchangeId)}/trade?with=${encodeURIComponent(ownerUserId)}&focus=${encodeURIComponent(itemId)}`);
}
