-- Add for-sale support on exchanges and inventory items.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ListingIntent') THEN
    CREATE TYPE "ListingIntent" AS ENUM ('SWAP', 'FREE', 'FOR_SALE');
  END IF;
END
$$;

ALTER TABLE "exchanges"
  ADD COLUMN "allowItemsForSale" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "inventory_items"
  ADD COLUMN "listingIntent" "ListingIntent" NOT NULL DEFAULT 'SWAP',
  ADD COLUMN "salePriceMinor" INTEGER,
  ADD COLUMN "saleCurrencyCode" VARCHAR(3),
  ADD COLUMN "saleExternalUrl" VARCHAR(2048);

-- Migrate existing free-to-good-home flags into the new listing intent enum.
UPDATE "inventory_items"
SET "listingIntent" = CASE
  WHEN "freeToGoodHome" = true THEN 'FREE'
  ELSE 'SWAP'
END::"ListingIntent";

ALTER TABLE "inventory_items"
  DROP COLUMN "freeToGoodHome";
