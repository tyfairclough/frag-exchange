import { NextResponse, type NextRequest, type NextProxy } from "next/server";
import { AUTH_NEXT_COOKIE, getSafeInternalNextPath } from "@/lib/safe-next-path";

export const proxy: NextProxy = (request: NextRequest) => {
  if (request.nextUrl.pathname !== "/auth/login") {
    return NextResponse.next();
  }

  const nextRaw = request.nextUrl.searchParams.get("next");
  const res = NextResponse.next();

  if (nextRaw) {
    const safe = getSafeInternalNextPath(nextRaw);
    if (safe) {
      res.cookies.set(AUTH_NEXT_COOKIE, safe, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 10,
      });
    } else {
      res.cookies.delete(AUTH_NEXT_COOKIE);
    }
  } else {
    res.cookies.delete(AUTH_NEXT_COOKIE);
  }

  return res;
};

export const config = {
  matcher: ["/auth/login"],
};
