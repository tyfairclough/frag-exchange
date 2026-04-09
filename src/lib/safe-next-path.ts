const AUTH_NEXT_COOKIE = "fe_auth_next";

/** Internal relative paths safe to use after sign-in (open redirect guard). */
export function getSafeInternalNextPath(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== "string") {
    return null;
  }
  let decoded = raw.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//")) {
    return null;
  }
  if (decoded.includes("://") || decoded.includes("..") || decoded.includes("\\")) {
    return null;
  }
  // Strip query/hash for validation
  const pathOnly = decoded.split(/[?#]/)[0] ?? decoded;
  if (pathOnly === "/exchanges" || pathOnly.startsWith("/exchanges/")) {
    return pathOnly;
  }
  if (pathOnly === "/onboarding") {
    return pathOnly;
  }
  if (pathOnly.startsWith("/shared/exchanges/")) {
    return pathOnly;
  }
  return null;
}

export { AUTH_NEXT_COOKIE };

