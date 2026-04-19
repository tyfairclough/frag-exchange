CREATE TYPE "InventoryImportEventLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

CREATE TYPE "InventoryImportEventStage" AS ENUM (
  'QUEUE_CLAIM',
  'REQUEST_PAGE',
  'PARSE_PAGE',
  'AI_CLASSIFY',
  'UPSERT_CANDIDATE',
  'SKIP',
  'DONE',
  'FAIL'
);

CREATE TABLE "inventory_import_events" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "level" "InventoryImportEventLevel" NOT NULL DEFAULT 'INFO',
  "stage" "InventoryImportEventStage" NOT NULL,
  "message" TEXT NOT NULL,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_import_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_import_events_jobId_createdAt_idx"
ON "inventory_import_events"("jobId", "createdAt");

ALTER TABLE "inventory_import_events"
ADD CONSTRAINT "inventory_import_events_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "inventory_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
