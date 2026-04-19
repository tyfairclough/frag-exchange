-- Expand corals into multi-kind inventory, repoint listings and trades.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryKind') THEN
    CREATE TYPE "InventoryKind" AS ENUM ('CORAL', 'FISH', 'EQUIPMENT');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EquipmentCategory') THEN
    CREATE TYPE "EquipmentCategory" AS ENUM ('LIGHTS', 'PUMPS', 'MONITORS_CONTROLLERS', 'FILTRATION', 'DOSING', 'OTHER');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EquipmentCondition') THEN
    CREATE TYPE "EquipmentCondition" AS ENUM ('LIKE_NEW', 'GOOD_CONDITION', 'WORKING', 'SPARES_REPAIRS');
  END IF;
END
$$;

-- 1) Add inventory columns to legacy `corals` table
ALTER TABLE "corals"
  ADD COLUMN "kind" "InventoryKind" NOT NULL,
  ADD COLUMN "species" VARCHAR(200),
  ADD COLUMN "reefSafe" BOOLEAN,
  ADD COLUMN "equipmentCategory" "EquipmentCategory",
  ADD COLUMN "equipmentCondition" "EquipmentCondition";

-- 2) Rename inventory table
ALTER TABLE "corals" RENAME TO "inventory_items";
ALTER TABLE "inventory_items" RENAME CONSTRAINT "corals_pkey" TO "inventory_items_pkey";
ALTER INDEX "corals_userId_idx" RENAME TO "inventory_items_userId_idx";
ALTER TABLE "inventory_items" RENAME CONSTRAINT "corals_userId_fkey" TO "inventory_items_userId_fkey";
CREATE INDEX "inventory_items_kind_idx" ON "inventory_items"("kind");

-- 3) Exchange listings: coralId -> inventoryItemId
ALTER TABLE "exchange_listings" DROP CONSTRAINT "exchange_listings_coralId_fkey";
DROP INDEX "exchange_listings_exchangeId_coralId_key";
ALTER TABLE "exchange_listings" RENAME COLUMN "coralId" TO "inventoryItemId";
CREATE UNIQUE INDEX "exchange_listings_exchangeId_inventoryItemId_key" ON "exchange_listings"("exchangeId", "inventoryItemId");
ALTER TABLE "exchange_listings" ADD CONSTRAINT "exchange_listings_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) Trade lines: rename table and coralId -> inventoryItemId (side / handoff enums unchanged)
-- MySQL: `trade_corals_tradeId_fkey` uses the left-prefix of `trade_corals_tradeId_coralId_key` as its
-- supporting index — drop that FK *before* dropping the unique index, then drop coral FK, then indexes.
ALTER TABLE "trade_corals" DROP CONSTRAINT "trade_corals_tradeId_fkey";
ALTER TABLE "trade_corals" DROP CONSTRAINT "trade_corals_coralId_fkey";
DROP INDEX "trade_corals_tradeId_coralId_key";
DROP INDEX "trade_corals_coralId_idx";
ALTER TABLE "trade_corals" RENAME COLUMN "coralId" TO "inventoryItemId";
ALTER TABLE "trade_corals" RENAME TO "trade_inventory_lines";
ALTER TABLE "trade_inventory_lines" RENAME CONSTRAINT "trade_corals_pkey" TO "trade_inventory_lines_pkey";
ALTER INDEX "trade_corals_eventHandoffStatus_idx" RENAME TO "trade_inventory_lines_eventHandoffStatus_idx";
CREATE UNIQUE INDEX "trade_inventory_lines_tradeId_inventoryItemId_key" ON "trade_inventory_lines"("tradeId", "inventoryItemId");
CREATE INDEX "trade_inventory_lines_inventoryItemId_idx" ON "trade_inventory_lines"("inventoryItemId");
ALTER TABLE "trade_inventory_lines" ADD CONSTRAINT "trade_inventory_lines_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trade_inventory_lines" ADD CONSTRAINT "trade_inventory_lines_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
