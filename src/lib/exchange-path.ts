/** Exchange UUID segment from `/exchanges/[id]/...`, excluding non-id routes. */
export function getExchangeIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/exchanges\/([^/]+)/);
  if (!match) {
    return null;
  }
  const id = decodeURIComponent(match[1]);
  if (id === "new" || id === "browse" || id === "invite") {
    return null;
  }
  return id;
}
