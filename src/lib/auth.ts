import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { getPrisma, throwIfDatabaseUnreachable } from "@/lib/db";

const SESSION_COOKIE = "fe_session";
const SESSION_TTL_DAYS = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function makeToken() {
  return randomBytes(32).toString("hex");
}

export async function createMagicLink(email: string, requestedIp?: string | null) {
  const normalizedEmail = email.trim().toLowerCase();
  let user;
  try {
    user = await getPrisma().user.upsert({
      where: { email: normalizedEmail },
      update: {},
      create: { email: normalizedEmail },
    });
  } catch (e) {
    throwIfDatabaseUnreachable(e);
  }

  const token = makeToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 20);

  await getPrisma().magicLinkToken.create({
    data: {
      userId: user.id,
      email: normalizedEmail,
      tokenHash,
      expiresAt,
      requestedIp: requestedIp ?? null,
    },
  });

  return { token, email: normalizedEmail };
}

export async function consumeMagicLink(token: string) {
  const tokenHash = hashToken(token);
  const link = await getPrisma().magicLinkToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!link || link.usedAt || link.expiresAt <= new Date()) {
    return null;
  }

  const markUsed = await getPrisma().magicLinkToken.updateMany({
    where: { id: link.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  if (markUsed.count !== 1) {
    return null;
  }

  return link.user;
}

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/**
 * @param attachResponse When set (e.g. magic-link verify `NextResponse.redirect`), the session
 * cookie is written on that response so the browser always receives it with the redirect.
 */
export async function createSession(userId: string, attachResponse?: NextResponse) {
  const token = makeToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * SESSION_TTL_DAYS);

  await getPrisma().session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const opts = { ...SESSION_COOKIE_OPTIONS, expires: expiresAt };
  if (attachResponse) {
    attachResponse.cookies.set(SESSION_COOKIE, token, opts);
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, opts);
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await getPrisma().session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const session = await getPrisma().session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { address: true } } },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }

  return user;
}
