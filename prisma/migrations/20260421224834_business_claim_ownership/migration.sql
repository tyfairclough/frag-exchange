-- CreateEnum
CREATE TYPE "BusinessAccountOwnership" AS ENUM ('CLAIMED', 'UNCLAIMED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "businessAccountOwnership" "BusinessAccountOwnership" NOT NULL DEFAULT 'CLAIMED';

-- CreateTable
CREATE TABLE "business_claims" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exchangeId" TEXT NOT NULL,
    "fullName" VARCHAR(160) NOT NULL,
    "businessEmail" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_claims_userId_createdAt_idx" ON "business_claims"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "business_claims" ADD CONSTRAINT "business_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_claims" ADD CONSTRAINT "business_claims_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "exchanges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
