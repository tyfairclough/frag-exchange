-- CreateTable
CREATE TABLE "exchange_listings" (
    "id" TEXT NOT NULL,
    "exchangeId" TEXT NOT NULL,
    "coralId" TEXT NOT NULL,
    "listedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "exchange_listings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "exchange_listings_exchangeId_expiresAt_idx" ON "exchange_listings"("exchangeId", "expiresAt");
CREATE UNIQUE INDEX "exchange_listings_exchangeId_coralId_key" ON "exchange_listings"("exchangeId", "coralId");

-- AddForeignKey
ALTER TABLE "exchange_listings" ADD CONSTRAINT "exchange_listings_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "exchanges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_listings" ADD CONSTRAINT "exchange_listings_coralId_fkey" FOREIGN KEY ("coralId") REFERENCES "corals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
