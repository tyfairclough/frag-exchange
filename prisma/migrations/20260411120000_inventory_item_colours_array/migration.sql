-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN "colours" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "inventory_items"
SET "colours" = ARRAY["colour"]::TEXT[]
WHERE "colour" IS NOT NULL AND BTRIM("colour") <> '';

ALTER TABLE "inventory_items" DROP COLUMN "colour";
