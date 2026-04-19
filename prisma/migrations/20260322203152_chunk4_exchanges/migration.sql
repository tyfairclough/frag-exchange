DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserGlobalRole') THEN
    CREATE TYPE "UserGlobalRole" AS ENUM ('MEMBER', 'SUPER_ADMIN');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExchangeKind') THEN
    CREATE TYPE "ExchangeKind" AS ENUM ('EVENT', 'GROUP');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExchangeVisibility') THEN
    CREATE TYPE "ExchangeVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExchangeMembershipRole') THEN
    CREATE TYPE "ExchangeMembershipRole" AS ENUM ('MEMBER', 'EVENT_MANAGER');
  END IF;
END
$$;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "globalRole" "UserGlobalRole" NOT NULL DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE "exchanges" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "kind" "ExchangeKind" NOT NULL,
    "visibility" "ExchangeVisibility" NOT NULL,
    "eventDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "exchanges_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "exchanges_visibility_kind_idx" ON "exchanges"("visibility", "kind");

-- CreateTable
CREATE TABLE "exchange_memberships" (
    "id" TEXT NOT NULL,
    "exchangeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ExchangeMembershipRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exchange_memberships_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "exchange_memberships_userId_idx" ON "exchange_memberships"("userId");
CREATE UNIQUE INDEX "exchange_memberships_exchangeId_userId_key" ON "exchange_memberships"("exchangeId", "userId");

-- CreateTable
CREATE TABLE "exchange_invites" (
    "id" TEXT NOT NULL,
    "exchangeId" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exchange_invites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "exchange_invites_tokenHash_key" ON "exchange_invites"("tokenHash");
CREATE INDEX "exchange_invites_exchangeId_email_idx" ON "exchange_invites"("exchangeId", "email");

-- AddForeignKey
ALTER TABLE "exchanges" ADD CONSTRAINT "exchanges_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_memberships" ADD CONSTRAINT "exchange_memberships_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "exchanges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_memberships" ADD CONSTRAINT "exchange_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_invites" ADD CONSTRAINT "exchange_invites_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "exchanges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_invites" ADD CONSTRAINT "exchange_invites_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
