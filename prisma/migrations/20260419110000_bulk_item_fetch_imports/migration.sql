-- Bulk item fetch import jobs and candidate rows
CREATE TYPE "InventoryImportJobStatus" AS ENUM (
  'QUEUED',
  'RUNNING',
  'REVIEW_READY',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

CREATE TABLE "inventory_import_jobs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceUrl" VARCHAR(2048) NOT NULL,
  "sourceHost" VARCHAR(255) NOT NULL,
  "status" "InventoryImportJobStatus" NOT NULL DEFAULT 'QUEUED',
  "maxPages" INTEGER NOT NULL DEFAULT 20,
  "maxDepth" INTEGER NOT NULL DEFAULT 2,
  "crawlDelayMs" INTEGER NOT NULL DEFAULT 250,
  "pagesVisited" INTEGER NOT NULL DEFAULT 0,
  "pagesParsed" INTEGER NOT NULL DEFAULT 0,
  "candidatesFound" INTEGER NOT NULL DEFAULT 0,
  "candidatesReady" INTEGER NOT NULL DEFAULT 0,
  "candidatesFailed" INTEGER NOT NULL DEFAULT 0,
  "runToken" VARCHAR(64),
  "runLeaseExpiresAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "notifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_import_candidates" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourcePageUrl" VARCHAR(2048) NOT NULL,
  "sourceHash" VARCHAR(64) NOT NULL,
  "title" VARCHAR(240),
  "snippet" TEXT,
  "kind" "InventoryKind",
  "confidenceScore" DOUBLE PRECISION,
  "name" VARCHAR(120),
  "description" TEXT,
  "imageUrl" VARCHAR(2048),
  "coralType" VARCHAR(120),
  "colours" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "species" VARCHAR(200),
  "reefSafe" BOOLEAN,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "salePriceMinor" INTEGER NOT NULL DEFAULT 100,
  "saleCurrencyCode" VARCHAR(3) NOT NULL DEFAULT 'GBP',
  "saleExternalUrl" VARCHAR(2048) NOT NULL,
  "selectedExchangeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "createdItemId" TEXT,
  "validationError" TEXT,
  "parseError" TEXT,
  "aiRaw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventory_import_candidates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventory_import_candidates_jobId_sourceHash_key"
ON "inventory_import_candidates"("jobId", "sourceHash");

CREATE INDEX "inventory_import_jobs_userId_createdAt_idx"
ON "inventory_import_jobs"("userId", "createdAt");

CREATE INDEX "inventory_import_jobs_status_createdAt_idx"
ON "inventory_import_jobs"("status", "createdAt");

CREATE INDEX "inventory_import_candidates_userId_sourceHash_idx"
ON "inventory_import_candidates"("userId", "sourceHash");

CREATE INDEX "inventory_import_candidates_jobId_approvedAt_idx"
ON "inventory_import_candidates"("jobId", "approvedAt");

ALTER TABLE "inventory_import_jobs"
ADD CONSTRAINT "inventory_import_jobs_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_import_candidates"
ADD CONSTRAINT "inventory_import_candidates_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "inventory_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_import_candidates"
ADD CONSTRAINT "inventory_import_candidates_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_import_candidates"
ADD CONSTRAINT "inventory_import_candidates_createdItemId_fkey"
FOREIGN KEY ("createdItemId") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
