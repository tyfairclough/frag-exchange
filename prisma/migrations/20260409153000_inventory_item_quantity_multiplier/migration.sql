-- Add quantity tracking to keep one listing active for multiple trades.
ALTER TABLE "inventory_items"
  ADD COLUMN "totalQuantity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "remainingQuantity" INTEGER NOT NULL DEFAULT 1;
