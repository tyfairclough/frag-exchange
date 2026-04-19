import { UserPostingRole } from "@/generated/prisma/enums";

export function isLfsPoster(user: { postingRole: UserPostingRole | null }): boolean {
  return user.postingRole === UserPostingRole.LFS;
}

export function isOnlineRetailerPoster(user: { postingRole: UserPostingRole | null }): boolean {
  return user.postingRole === UserPostingRole.ONLINE_RETAILER;
}

export function hasCommercialPostingRole(user: { postingRole: UserPostingRole | null }): boolean {
  return user.postingRole !== null;
}

export function canUseBulkItemFetch(user: { postingRole: UserPostingRole | null }): boolean {
  return isLfsPoster(user) || isOnlineRetailerPoster(user);
}
