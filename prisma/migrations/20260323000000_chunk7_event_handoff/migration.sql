-- Chunk 7: event-day check-in / check-out on approved trade corals (EVENT exchanges only).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TradeLineEventHandoffStatus') THEN
    CREATE TYPE "TradeLineEventHandoffStatus" AS ENUM ('AWAITING_CHECKIN', 'CHECKED_IN', 'CHECKED_OUT');
  END IF;
END
$$;

ALTER TABLE "trade_corals" ADD COLUMN "eventHandoffStatus" "TradeLineEventHandoffStatus";

CREATE INDEX "trade_corals_eventHandoffStatus_idx" ON "trade_corals"("eventHandoffStatus");

UPDATE "trade_corals" tc
SET "eventHandoffStatus" = 'AWAITING_CHECKIN'
FROM "trades" t
JOIN "exchanges" e ON e."id" = t."exchangeId"
WHERE t."id" = tc."tradeId"
  AND t."status" = 'APPROVED'
  AND e."kind" = 'EVENT';
