import { createHash, randomUUID } from "node:crypto";
import { InventoryImportJobStatus, InventoryKind, ListingIntent, CoralListingMode } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { isKindAllowedOnExchange } from "@/lib/listing-eligibility";
import { dispatchUserNotification } from "@/lib/notifications/dispatch";

const HTTP_TIMEOUT_MS = 12_000;
const MAX_AI_TEXT_LENGTH = 14_000;

const PRIVATE_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

function isPrivateIpv4(hostname: string): boolean {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return false;
  const [a, b] = hostname.split(".").map((v) => Number(v));
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function canFetchSourceUrl(rawUrl: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: "Provide a valid URL." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "URL must start with http:// or https://." };
  }
  if (PRIVATE_HOSTS.has(url.hostname.toLowerCase()) || isPrivateIpv4(url.hostname)) {
    return { ok: false, error: "Private/local addresses are not allowed." };
  }
  return { ok: true, url };
}

export async function createInventoryImportJob(params: {
  userId: string;
  sourceUrl: string;
  maxPages: number;
  maxDepth: number;
}): Promise<{ id: string }> {
  const valid = canFetchSourceUrl(params.sourceUrl);
  if (!valid.ok) {
    throw new Error(valid.error);
  }
  const created = await getPrisma().inventoryImportJob.create({
    data: {
      userId: params.userId,
      sourceUrl: valid.url.toString(),
      sourceHost: valid.url.host,
      maxPages: Math.min(Math.max(params.maxPages, 1), 60),
      maxDepth: Math.min(Math.max(params.maxDepth, 0), 3),
      crawlDelayMs: 250,
      status: InventoryImportJobStatus.QUEUED,
    },
    select: { id: true },
  });
  return created;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectSameOriginLinks(origin: string, current: URL, html: string): string[] {
  const links = new Set<string>();
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null = null;
  while ((match = hrefRegex.exec(html))) {
    const raw = match[1];
    if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) continue;
    try {
      const next = new URL(raw, current);
      if (next.origin !== origin) continue;
      next.hash = "";
      links.add(next.toString());
    } catch {
      continue;
    }
  }
  return [...links];
}

async function fetchPage(url: string): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "REEFXBot/1.0 (+inventory import)" },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      throw new Error("Not an HTML page");
    }
    const html = await res.text();
    return { html, finalUrl: res.url || url };
  } finally {
    clearTimeout(timer);
  }
}

type ParsedCandidate = {
  title?: string;
  snippet?: string;
  kind: "CORAL" | "FISH" | "IGNORE";
  confidence: number;
  name: string;
  description: string;
  imageUrl?: string | null;
  coralType?: string | null;
  colours?: string[];
  species?: string | null;
  reefSafe?: boolean | null;
  salePriceMinor?: number | null;
  saleCurrencyCode?: string | null;
  saleExternalUrl?: string | null;
};

async function parseCandidatesWithAi(text: string, pageUrl: string): Promise<ParsedCandidate[]> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return [];
  const model = process.env.CORAL_AI_MODEL?.trim() || "gpt-4o-mini";
  const payload = text.length > MAX_AI_TEXT_LENGTH ? text.slice(0, MAX_AI_TEXT_LENGTH) : text;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Extract retail listing items from page text. Return JSON only: {"items":[{"title":string,"snippet":string,"kind":"CORAL"|"FISH"|"IGNORE","confidence":number,"name":string,"description":string,"imageUrl":string|null,"coralType":string|null,"colours":string[],"species":string|null,"reefSafe":boolean|null,"salePriceMinor":number|null,"saleCurrencyCode":string|null,"saleExternalUrl":string|null}]}. Include only likely individual listing rows/cards from this page.',
        },
        {
          role: "user",
          content: `Page URL: ${pageUrl}\n\nPAGE TEXT:\n${payload}`,
        },
      ],
    }),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content;
  if (!content) return [];
  try {
    const parsed = JSON.parse(content) as { items?: ParsedCandidate[] };
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function makeSourceHash(pageUrl: string, name: string, kind: string): string {
  return createHash("sha256").update(`${pageUrl}|${kind}|${name.toLowerCase()}`).digest("hex");
}

export async function runInventoryImportWorker(limit = 1): Promise<{ processed: number }> {
  let processed = 0;
  for (let i = 0; i < limit; i += 1) {
    const claimed = await claimNextJob();
    if (!claimed) break;
    processed += 1;
    try {
      await processClaimedJob(claimed.id, claimed.runToken);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await getPrisma().inventoryImportJob.update({
        where: { id: claimed.id },
        data: {
          status: InventoryImportJobStatus.FAILED,
          lastError: message.slice(0, 8000),
          finishedAt: new Date(),
          runToken: null,
          runLeaseExpiresAt: null,
        },
      });
      await sendImportCompletionEmail(claimed.id, false, message);
    }
  }
  return { processed };
}

async function claimNextJob(): Promise<{ id: string; runToken: string } | null> {
  const now = new Date();
  const job = await getPrisma().inventoryImportJob.findFirst({
    where: {
      status: { in: [InventoryImportJobStatus.QUEUED, InventoryImportJobStatus.RUNNING] },
      OR: [{ runLeaseExpiresAt: null }, { runLeaseExpiresAt: { lt: now } }],
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!job) return null;
  const runToken = randomUUID();
  const leaseUntil = new Date(Date.now() + 60_000);
  const updated = await getPrisma().inventoryImportJob.updateMany({
    where: {
      id: job.id,
      OR: [{ runLeaseExpiresAt: null }, { runLeaseExpiresAt: { lt: now } }],
    },
    data: {
      status: InventoryImportJobStatus.RUNNING,
      runToken,
      runLeaseExpiresAt: leaseUntil,
      attemptCount: { increment: 1 },
      startedAt: now,
      lastError: null,
    },
  });
  if (updated.count !== 1) return null;
  return { id: job.id, runToken };
}

async function processClaimedJob(jobId: string, runToken: string): Promise<void> {
  const job = await getPrisma().inventoryImportJob.findUnique({
    where: { id: jobId },
    select: { id: true, userId: true, sourceUrl: true, sourceHost: true, maxPages: true, maxDepth: true },
  });
  if (!job) return;
  const origin = new URL(job.sourceUrl).origin;
  const queue: Array<{ url: string; depth: number }> = [{ url: job.sourceUrl, depth: 0 }];
  const seen = new Set<string>();
  let pagesVisited = 0;
  let pagesParsed = 0;
  let found = 0;
  let ready = 0;
  let failed = 0;

  while (queue.length > 0 && pagesVisited < job.maxPages) {
    const next = queue.shift();
    if (!next) break;
    if (seen.has(next.url)) continue;
    seen.add(next.url);
    pagesVisited += 1;
    try {
      const fetched = await fetchPage(next.url);
      const final = new URL(fetched.finalUrl);
      if (final.host !== job.sourceHost) continue;
      const text = stripHtml(fetched.html);
      if (text.length > 200) {
        pagesParsed += 1;
        const aiItems = await parseCandidatesWithAi(text, fetched.finalUrl);
        for (const item of aiItems) {
          if (item.kind !== "CORAL" && item.kind !== "FISH") continue;
          const name = item.name?.trim();
          if (!name) continue;
          found += 1;
          const sourceHash = makeSourceHash(fetched.finalUrl, name, item.kind);
          const salePriceMinor = Number.isInteger(item.salePriceMinor) && (item.salePriceMinor ?? 0) > 0 ? (item.salePriceMinor as number) : 100;
          const saleCurrencyCode = (item.saleCurrencyCode || "GBP").toUpperCase().slice(0, 3);
          const saleExternalUrl = item.saleExternalUrl?.trim() || fetched.finalUrl;
          await getPrisma().inventoryImportCandidate.upsert({
            where: { jobId_sourceHash: { jobId, sourceHash } },
            create: {
              jobId,
              userId: job.userId,
              sourcePageUrl: fetched.finalUrl,
              sourceHash,
              title: item.title?.slice(0, 240) || null,
              snippet: item.snippet || null,
              kind: item.kind === "CORAL" ? InventoryKind.CORAL : InventoryKind.FISH,
              confidenceScore: Math.max(0, Math.min(1, Number(item.confidence) || 0.4)),
              name: name.slice(0, 120),
              description: (item.description || `Imported from ${job.sourceHost}`).slice(0, 8000),
              imageUrl: item.imageUrl || null,
              coralType: item.coralType || null,
              colours: Array.isArray(item.colours) ? item.colours.slice(0, 12) : [],
              species: item.species?.slice(0, 200) || null,
              reefSafe: typeof item.reefSafe === "boolean" ? item.reefSafe : null,
              quantity: 1,
              salePriceMinor,
              saleCurrencyCode,
              saleExternalUrl,
              aiRaw: item as unknown as object,
            },
            update: {
              title: item.title?.slice(0, 240) || null,
              snippet: item.snippet || null,
              kind: item.kind === "CORAL" ? InventoryKind.CORAL : InventoryKind.FISH,
              confidenceScore: Math.max(0, Math.min(1, Number(item.confidence) || 0.4)),
              name: name.slice(0, 120),
              description: (item.description || `Imported from ${job.sourceHost}`).slice(0, 8000),
              imageUrl: item.imageUrl || null,
              coralType: item.coralType || null,
              colours: Array.isArray(item.colours) ? item.colours.slice(0, 12) : [],
              species: item.species?.slice(0, 200) || null,
              reefSafe: typeof item.reefSafe === "boolean" ? item.reefSafe : null,
              salePriceMinor,
              saleCurrencyCode,
              saleExternalUrl,
              parseError: null,
              aiRaw: item as unknown as object,
            },
          });
          ready += 1;
        }
      }

      if (next.depth < job.maxDepth) {
        const links = collectSameOriginLinks(origin, new URL(fetched.finalUrl), fetched.html);
        for (const link of links) {
          if (!seen.has(link)) queue.push({ url: link, depth: next.depth + 1 });
        }
      }
    } catch (e) {
      failed += 1;
      const message = e instanceof Error ? e.message : String(e);
      await getPrisma().inventoryImportCandidate.create({
        data: {
          jobId,
          userId: job.userId,
          sourcePageUrl: next.url,
          sourceHash: makeSourceHash(next.url, `parse-error-${pagesVisited}`, "IGNORE"),
          parseError: message.slice(0, 3000),
          saleExternalUrl: next.url,
        },
      });
    }
    await getPrisma().inventoryImportJob.updateMany({
      where: { id: jobId, runToken },
      data: {
        pagesVisited,
        pagesParsed,
        candidatesFound: found,
        candidatesReady: ready,
        candidatesFailed: failed,
        runLeaseExpiresAt: new Date(Date.now() + 60_000),
      },
    });
  }

  await getPrisma().inventoryImportJob.updateMany({
    where: { id: jobId, runToken },
    data: {
      status: InventoryImportJobStatus.REVIEW_READY,
      pagesVisited,
      pagesParsed,
      candidatesFound: found,
      candidatesReady: ready,
      candidatesFailed: failed,
      finishedAt: new Date(),
      runToken: null,
      runLeaseExpiresAt: null,
    },
  });
  await sendImportCompletionEmail(jobId, true);
}

async function sendImportCompletionEmail(jobId: string, success: boolean, error?: string) {
  const job = await getPrisma().inventoryImportJob.findUnique({
    where: { id: jobId },
    include: { user: { select: { id: true, email: true, alias: true, contactPreference: true } } },
  });
  if (!job || job.notifiedAt) return;
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "").replace(/\/$/, "");
  const reviewUrl = base ? `${base}/my-items/fetch/${job.id}` : `/my-items/fetch/${job.id}`;
  const subject = success ? "Your item fetch is ready for review" : "Your item fetch ended with an error";
  const lines = success
    ? [
        `We finished scanning ${job.sourceUrl}.`,
        `${job.candidatesReady} candidate items are ready to review.`,
        "Open the review table to edit and approve items.",
      ]
    : [`We could not finish scanning ${job.sourceUrl}.`, error ? `Error: ${error}` : "Please retry with a smaller page limit."];
  await dispatchUserNotification({
    user: job.user,
    eventType: "trade.expired",
    subject,
    textBody: `${subject}\n\n${lines.join("\n")}\n\nReview: ${reviewUrl}`,
    htmlBody: `<p>${subject}</p>${lines.map((l) => `<p>${l}</p>`).join("")}<p><a href="${reviewUrl}">Open review</a></p>`,
    secondaryPayload: { importJobId: job.id, success },
  });
  await getPrisma().inventoryImportJob.update({
    where: { id: jobId },
    data: { notifiedAt: new Date() },
  });
}

export async function publishApprovedImportCandidates(params: { userId: string; jobId: string }) {
  const job = await getPrisma().inventoryImportJob.findFirst({
    where: { id: params.jobId, userId: params.userId },
    select: { id: true },
  });
  if (!job) {
    throw new Error("Import job not found.");
  }

  const candidates = await getPrisma().inventoryImportCandidate.findMany({
    where: {
      jobId: params.jobId,
      userId: params.userId,
      approvedAt: { not: null },
      createdItemId: null,
      kind: { in: [InventoryKind.CORAL, InventoryKind.FISH] },
    },
    orderBy: { createdAt: "asc" },
  });

  const memberships = await getPrisma().exchangeMembership.findMany({
    where: { userId: params.userId },
    select: {
      exchangeId: true,
      exchange: {
        select: { id: true, allowCoral: true, allowFish: true, allowEquipment: true, allowItemsForSale: true },
      },
    },
  });
  const exchangeById = new Map(memberships.map((m) => [m.exchangeId, m.exchange]));
  const created: string[] = [];
  let failed = 0;

  for (const c of candidates) {
    if (!c.name || !c.description || !c.kind) {
      failed += 1;
      await getPrisma().inventoryImportCandidate.update({
        where: { id: c.id },
        data: { validationError: "Name, description, and kind are required." },
      });
      continue;
    }
    const item = await getPrisma().inventoryItem.create({
      data: {
        userId: params.userId,
        kind: c.kind,
        name: c.name,
        description: c.description,
        imageUrl: c.imageUrl,
        listingMode: CoralListingMode.BOTH,
        listingIntent: ListingIntent.FOR_SALE,
        salePriceMinor: c.salePriceMinor,
        saleCurrencyCode: c.saleCurrencyCode,
        saleExternalUrl: c.saleExternalUrl,
        totalQuantity: Math.max(1, c.quantity),
        remainingQuantity: Math.max(1, c.quantity),
        coralType: c.kind === InventoryKind.CORAL ? c.coralType : null,
        colours: c.colours,
        species: c.kind === InventoryKind.FISH ? c.species : null,
        reefSafe: c.kind === InventoryKind.FISH ? c.reefSafe : null,
        equipmentCategory: null,
        equipmentCondition: null,
      },
      select: { id: true },
    });
    created.push(item.id);
    await getPrisma().inventoryImportCandidate.update({
      where: { id: c.id },
      data: { createdItemId: item.id, validationError: null },
    });

    for (const exchangeId of c.selectedExchangeIds) {
      const exchange = exchangeById.get(exchangeId);
      if (!exchange || !isKindAllowedOnExchange(c.kind, exchange, ListingIntent.FOR_SALE)) continue;
      await getPrisma().exchangeListing.upsert({
        where: { exchangeId_inventoryItemId: { exchangeId, inventoryItemId: item.id } },
        create: {
          exchangeId,
          inventoryItemId: item.id,
          listedAt: new Date(),
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        },
        update: {
          listedAt: new Date(),
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        },
      });
    }
  }

  await getPrisma().inventoryImportJob.update({
    where: { id: params.jobId },
    data: { status: InventoryImportJobStatus.COMPLETED, finishedAt: new Date() },
  });
  return { createdCount: created.length, failedCount: failed };
}
