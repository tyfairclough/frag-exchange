DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContactPreference') THEN
    CREATE TYPE "ContactPreference" AS ENUM ('EMAIL', 'SMS');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OnboardingPath') THEN
    CREATE TYPE "OnboardingPath" AS ENUM ('EVENT_ONLY', 'GROUP_AND_EVENT');
  END IF;
END
$$;

-- AlterTable
ALTER TABLE "users"
    ALTER COLUMN "email" SET NOT NULL,
    ADD COLUMN "alias" VARCHAR(80),
    ADD COLUMN "avatarEmoji" VARCHAR(12),
    ADD COLUMN "tosAcceptedAt" TIMESTAMP(3),
    ADD COLUMN "tosVersion" VARCHAR(40),
    ADD COLUMN "contactPreference" "ContactPreference" NOT NULL DEFAULT 'EMAIL',
    ADD COLUMN "onboardingPath" "OnboardingPath",
    ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "line1" VARCHAR(255) NOT NULL,
    "line2" VARCHAR(255),
    "town" VARCHAR(120) NOT NULL,
    "region" VARCHAR(120),
    "postalCode" VARCHAR(40) NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_addresses_userId_key" ON "user_addresses"("userId");

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");
CREATE INDEX "sessions_userId_expiresAt_idx" ON "sessions"("userId", "expiresAt");

-- CreateTable
CREATE TABLE "magic_link_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedIp" VARCHAR(80),
    CONSTRAINT "magic_link_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "magic_link_tokens_tokenHash_key" ON "magic_link_tokens"("tokenHash");
CREATE INDEX "magic_link_tokens_userId_expiresAt_idx" ON "magic_link_tokens"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_link_tokens" ADD CONSTRAINT "magic_link_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
