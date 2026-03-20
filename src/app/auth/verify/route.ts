import { NextResponse } from "next/server";
import { consumeMagicLink, createSession } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login?error=invalid-token", request.url));
  }

  const user = await consumeMagicLink(token);
  if (!user) {
    return NextResponse.redirect(new URL("/auth/login?error=invalid-token", request.url));
  }

  await createSession(user.id);

  const destination = user.onboardingCompletedAt ? "/" : "/onboarding";
  return NextResponse.redirect(new URL(destination, request.url));
}
