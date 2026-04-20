-- AlterTable
ALTER TABLE "inventory_import_jobs"
  ADD COLUMN "detailUrlsDiscovered" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "detailUrlsProcessed" INTEGER NOT NULL DEFAULT 0;
