import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { getPrisma, throwIfMysqlPoolUnreachable } from "@/lib/db";

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
    throwIfMysqlPoolUnreachable(e);
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

export async function createSession(userId: string) {
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

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
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
