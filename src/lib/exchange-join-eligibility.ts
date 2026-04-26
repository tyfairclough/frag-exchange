import { UserPostingRole } from "@/generated/prisma/enums";

type ExchangeJoinTierConfig = {
  allowNormalMembersToJoin: boolean;
  allowOnlineRetailersToJoin: boolean;
  allowLocalFishStoresToJoin: boolean;
};

type UserTierSource = {
  postingRole: UserPostingRole | null;
};

export function canPostingRoleJoinExchange(user: UserTierSource, exchange: ExchangeJoinTierConfig): boolean {
  if (user.postingRole === UserPostingRole.ONLINE_RETAILER) {
    return exchange.allowOnlineRetailersToJoin;
  }
  if (user.postingRole === UserPostingRole.LFS) {
    return exchange.allowLocalFishStoresToJoin;
  }
  return exchange.allowNormalMembersToJoin;
}
