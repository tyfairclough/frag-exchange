import type { Prisma } from "@/generated/prisma/client";
import {
  InventoryImportJobRunKind,
  InventoryImportJobStatus,
  InventoryKind,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { canFetchSourceUrl, createInventoryImportJob, runInventoryImportJobById } from "@/lib/inventory-import";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function parseMaxPages(raw: unknown, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function parseMaxItems(raw: unknown): number | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || Math.trunc(n) < 1) return undefined;
  return Math.trunc(n);
}

export async function listBulkImportSourcesForUser(userId: string) {
  const prisma = getPrisma();
  return prisma.inventoryBulkImportSource.findMany({
    where: { userId, disabledAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      importJobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, createdAt: true, finishedAt: true, runKind: true },
      },
    },
  });
}

async function filterExchangeIdsForUser(userId: string, exchangeIds: string[]): Promise<string[]> {
  if (exchangeIds.length === 0) return [];
  const memberships = await getPrisma().exchangeMembership.findMany({
    where: { userId, exchangeId: { in: [...new Set(exchangeIds)] } },
    select: { exchangeId: true },
  });
  const allowed = new Set(memberships.map((m) => m.exchangeId));
  return exchangeIds.filter((id) => allowed.has(id));
}

export async function createBulkImportSource(params: {
  userId: string;
  sourceUrl: string;
  maxPages?: number;
  maxItems?: number | null;
  defaultKind?: InventoryKind | null;
  defaultExchangeIds?: string[];
  autoRefreshEnabled?: boolean;
  startFirstScan?: boolean;
}) {
  const valid = canFetchSourceUrl(params.sourceUrl);
  if (!valid.ok) {
    throw new Error(valid.error);
  }
  const prisma = getPrisma();
  const dup = await prisma.inventoryBulkImportSource.findFirst({
    where: { userId: params.userId, sourceUrl: valid.url.toString(), disabledAt: null },
    select: { id: true },
  });
  if (dup) {
    throw new Error("You already have a bulk import source for this URL.");
  }
  const maxPages = Math.min(Math.max(parseMaxPages(params.maxPages, 2), 0), 60);
  const maxItems = parseMaxItems(params.maxItems);
  const defaultExchangeIds = await filterExchangeIdsForUser(
    params.userId,
    params.defaultExchangeIds ?? [],
  );
  let defaultKind = params.defaultKind ?? null;
  if (defaultKind === InventoryKind.EQUIPMENT) {
    defaultKind = null;
  }
  const autoRefreshEnabled = Boolean(params.autoRefreshEnabled);
  const source = await prisma.inventoryBulkImportSource.create({
    data: {
      userId: params.userId,
      sourceUrl: valid.url.toString(),
      sourceHost: valid.url.host,
      maxPages,
      maxItems: maxItems === undefined ? undefined : maxItems,
      defaultKind,
      defaultExchangeIds,
      autoRefreshEnabled,
      autoRefreshEnabledAt: autoRefreshEnabled ? new Date() : null,
    },
  });
  let firstJobId: string | null = null;
  if (params.startFirstScan ?? true) {
    const job = await createInventoryImportJob({
      userId: params.userId,
      sourceUrl: source.sourceUrl,
      maxPages: source.maxPages,
      maxItems: source.maxItems,
      bulkImportSourceId: source.id,
      runKind: InventoryImportJobRunKind.INTERACTIVE,
    });
    firstJobId = job.id;
    void runInventoryImportJobById(job.id);
  }
  return { source, firstJobId };
}

export async function updateBulkImportSource(params: {
  userId: string;
  sourceId: string;
  maxPages?: number;
  maxItems?: number | null;
  defaultKind?: InventoryKind | null;
  defaultExchangeIds?: string[];
  autoRefreshEnabled?: boolean;
}) {
  const prisma = getPrisma();
  const existing = await prisma.inventoryBulkImportSource.findFirst({
    where: { id: params.sourceId, userId: params.userId, disabledAt: null },
  });
  if (!existing) {
    throw new Error("Source not found.");
  }
  const data: Prisma.InventoryBulkImportSourceUpdateInput = {};
  if (params.maxPages !== undefined) {
    data.maxPages = Math.min(Math.max(parseMaxPages(params.maxPages, existing.maxPages), 0), 60);
  }
  if (params.maxItems !== undefined) {
    data.maxItems = params.maxItems;
  }
  if (params.defaultExchangeIds !== undefined) {
    data.defaultExchangeIds = await filterExchangeIdsForUser(params.userId, params.defaultExchangeIds);
  }
  if (params.defaultKind !== undefined) {
    let k = params.defaultKind;
    if (k === InventoryKind.EQUIPMENT) k = null;
    data.defaultKind = k;
  }
  if (params.autoRefreshEnabled !== undefined) {
    data.autoRefreshEnabled = params.autoRefreshEnabled;
    data.autoRefreshEnabledAt = params.autoRefreshEnabled ? new Date() : null;
  }
  if (Object.keys(data).length === 0) {
    throw new Error("Nothing to update.");
  }
  return prisma.inventoryBulkImportSource.update({
    where: { id: params.sourceId },
    data,
  });
}

export async function softDeleteBulkImportSource(userId: string, sourceId: string) {
  const prisma = getPrisma();
  const existing = await prisma.inventoryBulkImportSource.findFirst({
    where: { id: sourceId, userId, disabledAt: null },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Source not found.");
  }
  await prisma.inventoryBulkImportSource.update({
    where: { id: sourceId },
    data: {
      disabledAt: new Date(),
      autoRefreshEnabled: false,
      autoRefreshEnabledAt: null,
    },
  });
}

export async function startInteractiveImportForSource(userId: string, sourceId: string) {
  const prisma = getPrisma();
  const source = await prisma.inventoryBulkImportSource.findFirst({
    where: { id: sourceId, userId, disabledAt: null },
  });
  if (!source) {
    throw new Error("Source not found.");
  }
  const active = await prisma.inventoryImportJob.count({
    where: {
      bulkImportSourceId: source.id,
      status: { in: [InventoryImportJobStatus.QUEUED, InventoryImportJobStatus.RUNNING] },
    },
  });
  if (active > 0) {
    throw new Error("An import is already running or queued for this source.");
  }
  const job = await createInventoryImportJob({
    userId,
    sourceUrl: source.sourceUrl,
    maxPages: source.maxPages,
    maxItems: source.maxItems,
    bulkImportSourceId: source.id,
    runKind: InventoryImportJobRunKind.INTERACTIVE,
  });
  void runInventoryImportJobById(job.id);
  return { jobId: job.id };
}

/**
 * Enqueues one `SCHEDULED_DELTA` job per due source (weekly window). Caller should run `runInventoryImportWorker(1)` after.
 */
export async function enqueueDueScheduledBulkImportSources(now = new Date()): Promise<{ enqueued: number }> {
  const prisma = getPrisma();
  const threshold = new Date(now.getTime() - WEEK_MS);
  const sources = await prisma.inventoryBulkImportSource.findMany({
    where: {
      autoRefreshEnabled: true,
      disabledAt: null,
    },
    orderBy: { createdAt: "asc" },
    take: 120,
  });
  const due = sources.filter((s) => {
    if (s.lastScheduledRunAt) {
      return s.lastScheduledRunAt.getTime() < threshold.getTime();
    }
    const anchorMs = (s.autoRefreshEnabledAt ?? s.createdAt).getTime();
    return anchorMs < threshold.getTime();
  });
  let enqueued = 0;
  for (const s of due.slice(0, 80)) {
    const active = await prisma.inventoryImportJob.count({
      where: {
        bulkImportSourceId: s.id,
        status: { in: [InventoryImportJobStatus.QUEUED, InventoryImportJobStatus.RUNNING] },
      },
    });
    if (active > 0) continue;
    await createInventoryImportJob({
      userId: s.userId,
      sourceUrl: s.sourceUrl,
      maxPages: s.maxPages,
      maxItems: s.maxItems,
      bulkImportSourceId: s.id,
      runKind: InventoryImportJobRunKind.SCHEDULED_DELTA,
    });
    enqueued += 1;
  }
  return { enqueued };
}
