export type UserAvatarImageFields = {
  avatar40Url: string | null;
  avatar80Url: string | null;
  avatar256Url: string | null;
};

export function userAvatarUrlForUi(row: UserAvatarImageFields): string | null {
  return row.avatar80Url ?? row.avatar256Url ?? row.avatar40Url ?? null;
}

export function userAvatarSrcSetForUi(row: UserAvatarImageFields): string | undefined {
  const a = row.avatar40Url;
  const b = row.avatar80Url;
  if (a && b) {
    return `${a} 1x, ${b} 2x`;
  }
  return undefined;
}
