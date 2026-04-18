/** Shared logo URL fields on `Exchange` (and similar selects). */
export type ExchangeLogoFields = {
  logo40Url: string | null;
  logo80Url: string | null;
  logo512Url: string | null;
};

/**
 * Best URL for ~40px CSS square avatars (e.g. `h-10 w-10`): prefer 80px bitmap for HiDPI.
 */
export function exchangeLogoUrlForListThumbnail(row: ExchangeLogoFields): string | null {
  return row.logo80Url ?? row.logo512Url ?? row.logo40Url ?? null;
}

/**
 * Optional `srcSet` for list thumbnails: 1x → 40px asset, 2x → 80px when both exist.
 */
export function exchangeLogoSrcSetForListThumbnail(row: ExchangeLogoFields): string | undefined {
  const a = row.logo40Url;
  const b = row.logo80Url;
  if (a && b) {
    return `${a} 1x, ${b} 2x`;
  }
  return undefined;
}
