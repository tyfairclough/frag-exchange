/** Exchange UUID segment from `/exchanges/[id]/...` or `/operator/[id]`, excluding non-id routes. */
export function getExchangeIdFromPathname(pathname: string): string | null {
  const ex = pathname.match(/^\/exchanges\/([^/]+)/);
  if (ex) {
    const id = decodeURIComponent(ex[1]);
    if (id === "new" || id === "browse" || id === "invite") {
      return null;
    }
    return id;
  }
  const op = pathname.match(/^\/operator\/([^/]+)/);
  if (op) {
    return decodeURIComponent(op[1]);
  }
  return null;
}
