-- CreateEnum
CREATE TYPE "InventoryImportJobRunKind" AS ENUM ('INTERACTIVE', 'SCHEDULED_DELTA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InventoryImportEventStage" ADD VALUE 'SCHEDULED_APPLY';
ALTER TYPE "InventoryImportEventStage" ADD VALUE 'SCHEDULED_DELETE_SKIPPED';

-- AlterTable
ALTER TABLE "inventory_import_jobs" ADD COLUMN     "bulkImportSourceId" TEXT,
ADD COLUMN     "runKind" "InventoryImportJobRunKind" NOT NULL DEFAULT 'INTERACTIVE';

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "bulkImportSourceId" TEXT;

-- CreateTable
CREATE TABLE "inventory_bulk_import_sources" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceUrl" VARCHAR(2048) NOT NULL,
    "sourceHost" VARCHAR(255) NOT NULL,
    "maxPages" INTEGER NOT NULL DEFAULT 2,
    "maxItems" INTEGER,
    "defaultKind" "InventoryKind",
    "defaultExchangeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "autoRefreshEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoRefreshEnabledAt" TIMESTAMP(3),
    "lastScheduledRunAt" TIMESTAMP(3),
    "lastScheduledRunError" TEXT,
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_bulk_import_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_bulk_import_sources_userId_disabledAt_idx" ON "inventory_bulk_import_sources"("userId", "disabledAt");

-- CreateIndex
CREATE INDEX "inventory_bulk_import_sources_userId_autoRefreshEnabled_idx" ON "inventory_bulk_import_sources"("userId", "autoRefreshEnabled");

-- CreateIndex
CREATE INDEX "inventory_import_jobs_bulkImportSourceId_status_idx" ON "inventory_import_jobs"("bulkImportSourceId", "status");

-- CreateIndex
CREATE INDEX "inventory_items_bulkImportSourceId_idx" ON "inventory_items"("bulkImportSourceId");

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_bulkImportSourceId_fkey" FOREIGN KEY ("bulkImportSourceId") REFERENCES "inventory_bulk_import_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_bulk_import_sources" ADD CONSTRAINT "inventory_bulk_import_sources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_import_jobs" ADD CONSTRAINT "inventory_import_jobs_bulkImportSourceId_fkey" FOREIGN KEY ("bulkImportSourceId") REFERENCES "inventory_bulk_import_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
