-- Chunk 6: trades FSM, coral sides, version column for race-safe accept
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TradeStatus') THEN
    CREATE TYPE "TradeStatus" AS ENUM ('OFFER', 'REJECTED', 'COUNTERED', 'APPROVED', 'EXPIRED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TradeLineSide') THEN
    CREATE TYPE "TradeLineSide" AS ENUM ('INITIATOR', 'PEER');
  END IF;
END
$$;

CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "exchangeId" TEXT NOT NULL,
    "initiatorUserId" TEXT NOT NULL,
    "peerUserId" TEXT NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'OFFER',
    "version" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trade_corals" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "coralId" TEXT NOT NULL,
    "side" "TradeLineSide" NOT NULL,
    CONSTRAINT "trade_corals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trade_corals_tradeId_coralId_key" ON "trade_corals"("tradeId", "coralId");
CREATE INDEX "trade_corals_coralId_idx" ON "trade_corals"("coralId");

CREATE INDEX "trades_exchangeId_status_idx" ON "trades"("exchangeId", "status");
CREATE INDEX "trades_initiatorUserId_idx" ON "trades"("initiatorUserId");
CREATE INDEX "trades_peerUserId_idx" ON "trades"("peerUserId");

ALTER TABLE "trades" ADD CONSTRAINT "trades_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "exchanges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trades" ADD CONSTRAINT "trades_initiatorUserId_fkey" FOREIGN KEY ("initiatorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trades" ADD CONSTRAINT "trades_peerUserId_fkey" FOREIGN KEY ("peerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "trade_corals" ADD CONSTRAINT "trade_corals_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trade_corals" ADD CONSTRAINT "trade_corals_coralId_fkey" FOREIGN KEY ("coralId") REFERENCES "corals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
