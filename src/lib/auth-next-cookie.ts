import { cookies } from "next/headers";
import { AUTH_NEXT_COOKIE, getSafeInternalNextPath } from "@/lib/safe-next-path";

/** Read and clear post-login redirect path (set from `/auth/login?next=`). */
export async function consumeAuthNextCookie(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(AUTH_NEXT_COOKIE)?.value;
  store.delete(AUTH_NEXT_COOKIE);
  return getSafeInternalNextPath(raw ?? undefined);
}
