import { ExchangeKind } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";

type GateResult = {
  blocked: boolean;
  redirectPath: string | null;
};

export async function getGroupAddressGate(exchangeId: string, userId: string, returnPath: string): Promise<GateResult> {
  const exchange = await getPrisma().exchange.findUnique({
    where: { id: exchangeId },
    select: { kind: true },
  });
  if (!exchange || exchange.kind !== ExchangeKind.GROUP) {
    return { blocked: false, redirectPath: null };
  }
  const address = await getPrisma().userAddress.findUnique({
    where: { userId },
    select: { line1: true, town: true, postalCode: true, countryCode: true },
  });
  const hasCompleteAddress = Boolean(address?.line1 && address.town && address.postalCode && address.countryCode?.length === 2);
  if (hasCompleteAddress) {
    return { blocked: false, redirectPath: null };
  }
  return {
    blocked: true,
    redirectPath: `/onboarding?mode=address&error=address-required-group&next=${encodeURIComponent(returnPath)}`,
  };
}

