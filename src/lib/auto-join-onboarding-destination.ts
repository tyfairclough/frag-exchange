import { ExchangeMembershipRole, ExchangeVisibility } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { canPostingRoleJoinExchange } from "@/lib/exchange-join-eligibility";

type AutoJoinResult = {
  destination: string;
  joined: boolean;
  exchangeId: string | null;
};

function exchangeIdFromPath(destination: string): string | null {
  const match = destination.match(/^\/exchanges\/([^/?#]+)$/);
  if (!match) {
    return null;
  }
  const raw = match[1] ?? "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function autoJoinOnboardingDestination(userId: string, destination: string): Promise<AutoJoinResult> {
  const exchangeId = exchangeIdFromPath(destination);
  if (!exchangeId) {
    return { destination, joined: false, exchangeId: null };
  }

  const exchange = await getPrisma().exchange.findFirst({
    where: { id: exchangeId, visibility: ExchangeVisibility.PUBLIC },
    select: {
      id: true,
      allowNormalMembersToJoin: true,
      allowOnlineRetailersToJoin: true,
      allowLocalFishStoresToJoin: true,
    },
  });
  if (!exchange) {
    return { destination, joined: false, exchangeId };
  }
  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: { postingRole: true },
  });
  if (!user || !canPostingRoleJoinExchange(user, exchange)) {
    return {
      destination: `/exchanges?error=join-tier-blocked`,
      joined: false,
      exchangeId,
    };
  }

  await getPrisma().exchangeMembership.upsert({
    where: {
      exchangeId_userId: { exchangeId, userId },
    },
    create: {
      exchangeId,
      userId,
      role: ExchangeMembershipRole.MEMBER,
    },
    update: {},
  });

  return {
    destination: `/exchanges/${encodeURIComponent(exchangeId)}?joined=1`,
    joined: true,
    exchangeId,
  };
}

