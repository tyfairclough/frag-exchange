import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import {
  InventoryImportEventLevel,
  InventoryImportEventStage,
  InventoryImportJobStatus,
  InventoryKind,
  ListingIntent,
  CoralListingMode,
} from "@/generated/prisma/enums";
import { mirrorHttpImageUrlToUploads } from "@/lib/coral-upload";
import { getPrisma } from "@/lib/db";
import { isKindAllowedOnExchange } from "@/lib/listing-eligibility";
import { dispatchUserNotification } from "@/lib/notifications/dispatch";

const HTTP_TIMEOUT_MS = 12_000;
/** Must cover fetch + OpenAI; lease was 60s while OpenAI had no timeout — caused reclaim mid-call. */
const IMPORT_JOB_LEASE_MS = 10 * 60 * 1000;
const OPENAI_COMPLETION_TIMEOUT_MS = 120_000;
const MAX_AI_TEXT_LENGTH = 14_000;

const PRIVATE_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

async function extendImportJobLease(jobId: string, runToken: string): Promise<void> {
  await getPrisma().inventoryImportJob.updateMany({
    where: { id: jobId, runToken },
    data: { runLeaseExpiresAt: new Date(Date.now() + IMPORT_JOB_LEASE_MS) },
  });
}

async function appendImportEvent(params: {
  jobId: string;
  stage: InventoryImportEventStage;
  message: string;
  level?: InventoryImportEventLevel;
  meta?: Prisma.InputJsonValue;
}) {
  await getPrisma().inventoryImportEvent.create({
    data: {
      jobId: params.jobId,
      stage: params.stage,
      message: params.message,
      level: params.level ?? InventoryImportEventLevel.INFO,
      meta: params.meta ?? undefined,
    },
  });
}

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
  const dbPayload = {
    userId: params.userId,
    sourceUrl: valid.url.toString(),
    sourceHost: valid.url.host,
    maxPages: Math.min(Math.max(params.maxPages, 1), 60),
    maxDepth: Math.min(Math.max(params.maxDepth, 0), 3),
    crawlDelayMs: 250,
    status: InventoryImportJobStatus.QUEUED,
  };
  const created = await getPrisma().inventoryImportJob.create({
    data: dbPayload,
    select: { id: true },
  });
  await appendImportEvent({
    jobId: created.id,
    stage: InventoryImportEventStage.QUEUE_CLAIM,
    message: "Import job queued and waiting for worker.",
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

const MAX_EXTRACTED_IMAGE_URLS = 80;

/**
 * Pull http(s) image URLs from raw HTML (img src, lazy data-* attrs, srcset, og:image).
 * Stripped page text does not contain these; the model needs this list to fill imageUrl.
 */
function extractImageUrlsFromHtml(html: string, pageUrl: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const pushRaw = (raw: string | undefined) => {
    if (out.length >= MAX_EXTRACTED_IMAGE_URLS) return;
    if (!raw) return;
    const t = raw.trim().replace(/&amp;/g, "&");
    if (!t || t.startsWith("data:") || t.startsWith("#")) return;
    try {
      const resolved = new URL(t, pageUrl).href;
      if (!/^https?:\/\//i.test(resolved)) return;
      const lower = resolved.toLowerCase();
      if (lower.includes("blank.gif") || lower.includes("spacer.gif") || lower.includes("pixel.gif")) return;
      if (seen.has(resolved)) return;
      seen.add(resolved);
      out.push(resolved);
    } catch {
      /* ignore */
    }
  };

  const splitSrcset = (value: string) => {
    for (const piece of value.split(",")) {
      const urlPart = piece.trim().split(/\s+/)[0];
      pushRaw(urlPart);
      if (out.length >= MAX_EXTRACTED_IMAGE_URLS) return;
    }
  };

  const reImgSrc = /<img[^>]+src\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null = reImgSrc.exec(html);
  while (m !== null) {
    pushRaw(m[1]);
    if (out.length >= MAX_EXTRACTED_IMAGE_URLS) break;
    m = reImgSrc.exec(html);
  }

  const reDataSrc =
    /\bdata-(?:src|lazy-src|lazyload|lazy|original|zoom-image|zoom-src)\s*=\s*["']([^"']+)["']/gi;
  m = reDataSrc.exec(html);
  while (m !== null) {
    pushRaw(m[1]);
    if (out.length >= MAX_EXTRACTED_IMAGE_URLS) break;
    m = reDataSrc.exec(html);
  }

  const reSrcset = /\bsrcset\s*=\s*["']([^"']+)["']/gi;
  m = reSrcset.exec(html);
  while (m !== null) {
    splitSrcset(m[1]);
    if (out.length >= MAX_EXTRACTED_IMAGE_URLS) break;
    m = reSrcset.exec(html);
  }

  const og1 = /<meta\s[^>]*property\s*=\s*["']og:image["'][^>]*content\s*=\s*["']([^"']+)["']/i.exec(html);
  if (og1) pushRaw(og1[1]);
  const og2 = /<meta\s[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:image["']/i.exec(html);
  if (og2) pushRaw(og2[1]);

  return out;
}

/** Append extracted image URLs so the model can copy exact strings into imageUrl. */
function buildModelInputForAi(strippedText: string, html: string, pageUrl: string): string {
  const urls = extractImageUrlsFromHtml(html, pageUrl);
  if (urls.length === 0) {
    return strippedText.length > MAX_AI_TEXT_LENGTH ? strippedText.slice(0, MAX_AI_TEXT_LENGTH) : strippedText;
  }
  const hintLines = urls.map((u) => `- ${u}`).join("\n");
  const hintBlock = `\n\nIMAGE_URLS_FOUND_IN_HTML (${urls.length} URLs — for each item set imageUrl to the exact line that matches that product photo, or null if none match):\n${hintLines}\n`;
  const maxCore = Math.max(400, MAX_AI_TEXT_LENGTH - hintBlock.length);
  const core = strippedText.length > maxCore ? strippedText.slice(0, maxCore) : strippedText;
  return core + hintBlock;
}

/** Same-origin links to scripts, styles, images, etc. are not crawl targets. */
const STATIC_ASSET_PATH =
  /\.(css|js|mjs|cjs|map|png|jpe?g|gif|webp|svg|avif|ico|bmp|woff2?|ttf|eot|otf|mp4|webm|pdf|zip|gz)(\?[^#]*)?$/i;

function isLikelyStaticAssetUrl(u: URL): boolean {
  return STATIC_ASSET_PATH.test(u.pathname);
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
      if (isLikelyStaticAssetUrl(next)) continue;
      next.hash = "";
      links.add(next.toString());
    } catch {
      continue;
    }
  }
  return [...links];
}

type FetchedPage = { html: string; finalUrl: string; isHtml: boolean };

async function fetchPage(url: string): Promise<FetchedPage> {
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
    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    const looksLikeHtmlDoc =
      contentType.includes("text/html") ||
      contentType.includes("application/xhtml") ||
      contentType.trim() === "";
    if (!looksLikeHtmlDoc) {
      if (res.body) await res.body.cancel().catch(() => {});
      return { html: "", finalUrl: res.url || url, isHtml: false };
    }
    const html = await res.text();
    return { html, finalUrl: res.url || url, isHtml: true };
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
  const bodyStr = JSON.stringify({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'Extract retail listing items from page text. If IMAGE_URLS_FOUND_IN_HTML is present, each item imageUrl must be copied exactly from that list (the best match for that row\'s product image) or null — do not invent URLs. Return JSON only: {"items":[{"title":string,"snippet":string,"kind":"CORAL"|"FISH"|"IGNORE","confidence":number,"name":string,"description":string,"imageUrl":string|null,"coralType":string|null,"colours":string[],"species":string|null,"reefSafe":boolean|null,"salePriceMinor":number|null,"saleCurrencyCode":string|null,"saleExternalUrl":string|null}]}. Include only likely individual listing rows/cards from this page.',
      },
      {
        role: "user",
        content: `Page URL: ${pageUrl}\n\nPAGE TEXT:\n${payload}`,
      },
    ],
  });

  /** Wall-clock cap: undici fetch can ignore AbortSignal and hang; Promise.race always settles. */
  const ac = new AbortController();
  let raceTimer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    raceTimer = setTimeout(() => {
      try {
        ac.abort();
      } catch {
        /* ignore */
      }
      reject(new Error("openai_fetch_race_timeout"));
    }, OPENAI_COMPLETION_TIMEOUT_MS);
  });
  const fetchPromise = fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    signal: ac.signal,
    body: bodyStr,
  });

  let res: Response;
  try {
    res = await Promise.race([
      fetchPromise.finally(() => {
        if (raceTimer !== undefined) clearTimeout(raceTimer);
      }),
      timeoutPromise,
    ]);
  } catch (e) {
    return [];
  }
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
      await appendImportEvent({
        jobId: claimed.id,
        stage: InventoryImportEventStage.FAIL,
        level: InventoryImportEventLevel.ERROR,
        message: "Job failed unexpectedly.",
        meta: { error: message.slice(0, 500) },
      });
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

export async function runInventoryImportJobById(jobId: string): Promise<{ processed: boolean; reason?: string }> {
  const now = new Date();
  const runToken = randomUUID();
  const leaseUntil = new Date(Date.now() + IMPORT_JOB_LEASE_MS);
  const claimed = await getPrisma().inventoryImportJob.updateMany({
    where: {
      id: jobId,
      status: InventoryImportJobStatus.QUEUED,
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
  if (claimed.count !== 1) {
    return { processed: false, reason: "not_claimed" };
  }
  await appendImportEvent({
    jobId,
    stage: InventoryImportEventStage.QUEUE_CLAIM,
    message: "Worker claimed newly created import job.",
  });
  try {
    await processClaimedJob(jobId, runToken);
    return { processed: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await appendImportEvent({
      jobId,
      stage: InventoryImportEventStage.FAIL,
      level: InventoryImportEventLevel.ERROR,
      message: "Job failed unexpectedly.",
      meta: { error: message.slice(0, 500) },
    });
    await getPrisma().inventoryImportJob.update({
      where: { id: jobId },
      data: {
        status: InventoryImportJobStatus.FAILED,
        lastError: message.slice(0, 8000),
        finishedAt: new Date(),
        runToken: null,
        runLeaseExpiresAt: null,
      },
    });
    await sendImportCompletionEmail(jobId, false, message);
    return { processed: false, reason: "failed" };
  }
}

async function claimNextJob(): Promise<{ id: string; runToken: string } | null> {
  const now = new Date();
  const queuedJob = await getPrisma().inventoryImportJob.findFirst({
    where: {
      status: InventoryImportJobStatus.QUEUED,
      OR: [{ runLeaseExpiresAt: null }, { runLeaseExpiresAt: { lt: now } }],
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const staleRunningJob = queuedJob
    ? null
    : await getPrisma().inventoryImportJob.findFirst({
        where: {
          status: InventoryImportJobStatus.RUNNING,
          runLeaseExpiresAt: { lt: now },
        },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
  const job = queuedJob ?? staleRunningJob;
  if (!job) return null;
  const runToken = randomUUID();
  const leaseUntil = new Date(Date.now() + IMPORT_JOB_LEASE_MS);
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
  await appendImportEvent({
    jobId: job.id,
    stage: InventoryImportEventStage.QUEUE_CLAIM,
    message: queuedJob ? "Worker claimed queued import job." : "Worker reclaimed stale running import job.",
  });
  return { id: job.id, runToken };
}

async function processClaimedJob(jobId: string, runToken: string): Promise<void> {
  const job = await getPrisma().inventoryImportJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      userId: true,
      sourceUrl: true,
      sourceHost: true,
      maxPages: true,
      maxDepth: true,
      attemptCount: true,
    },
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
    await extendImportJobLease(jobId, runToken);
    await appendImportEvent({
      jobId,
      stage: InventoryImportEventStage.REQUEST_PAGE,
      message: `Requesting page ${pagesVisited}/${job.maxPages}.`,
      meta: { url: next.url, depth: next.depth },
    });
    try {
      const fetched = await fetchPage(next.url);
      const final = new URL(fetched.finalUrl);
      if (final.host !== job.sourceHost) {
        await appendImportEvent({
          jobId,
          stage: InventoryImportEventStage.SKIP,
          level: InventoryImportEventLevel.WARN,
          message: "Skipped cross-host URL.",
          meta: { url: fetched.finalUrl, expectedHost: job.sourceHost },
        });
        continue;
      }
      if (!fetched.isHtml) {
        await appendImportEvent({
          jobId,
          stage: InventoryImportEventStage.SKIP,
          message: "Skipped non-HTML URL (stylesheet, script, media, or other asset).",
          meta: { url: fetched.finalUrl },
        });
        continue;
      }
      const text = stripHtml(fetched.html);
      await appendImportEvent({
        jobId,
        stage: InventoryImportEventStage.PARSE_PAGE,
        message: "Fetched and normalized HTML page text.",
        meta: { url: fetched.finalUrl, textLength: text.length },
      });
      if (text.length > 200) {
        pagesParsed += 1;
        await appendImportEvent({
          jobId,
          stage: InventoryImportEventStage.AI_CLASSIFY,
          message: "Sending page text to AI classification.",
          meta: { url: fetched.finalUrl },
        });
        await extendImportJobLease(jobId, runToken);
        const modelInput = buildModelInputForAi(text, fetched.html, fetched.finalUrl);
        const aiItems = await parseCandidatesWithAi(modelInput, fetched.finalUrl);
        await appendImportEvent({
          jobId,
          stage: InventoryImportEventStage.AI_CLASSIFY,
          message: "AI classification completed.",
          meta: { url: fetched.finalUrl, returnedItems: aiItems.length },
        });
        for (const item of aiItems) {
          if (item.kind !== "CORAL" && item.kind !== "FISH") {
            await appendImportEvent({
              jobId,
              stage: InventoryImportEventStage.SKIP,
              message: "Skipped non-fish/non-coral candidate.",
              meta: { url: fetched.finalUrl, kind: item.kind, title: item.title ?? null },
            });
            continue;
          }
          const name = item.name?.trim();
          if (!name) {
            await appendImportEvent({
              jobId,
              stage: InventoryImportEventStage.SKIP,
              level: InventoryImportEventLevel.WARN,
              message: "Skipped candidate without name.",
              meta: { url: fetched.finalUrl, kind: item.kind },
            });
            continue;
          }
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
              description: (item.description?.trim() || "").slice(0, 8000) || null,
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
              description: (item.description?.trim() || "").slice(0, 8000) || null,
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
          await appendImportEvent({
            jobId,
            stage: InventoryImportEventStage.UPSERT_CANDIDATE,
            message: "Saved parsed candidate.",
            meta: {
              url: fetched.finalUrl,
              kind: item.kind,
              name: name.slice(0, 120),
              confidence: Number(item.confidence) || null,
            },
          });
        }
      } else {
        await appendImportEvent({
          jobId,
          stage: InventoryImportEventStage.SKIP,
          message: "Skipped page with insufficient text content.",
          meta: { url: fetched.finalUrl, textLength: text.length },
        });
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
      const errSourceHash = makeSourceHash(next.url, `parse-error-${pagesVisited}`, "IGNORE");
      await appendImportEvent({
        jobId,
        stage: InventoryImportEventStage.FAIL,
        level: InventoryImportEventLevel.ERROR,
        message: "Page processing failed.",
        meta: { url: next.url, error: message.slice(0, 500) },
      });
      await getPrisma().inventoryImportCandidate.create({
        data: {
          jobId,
          userId: job.userId,
          sourcePageUrl: next.url,
          sourceHash: errSourceHash,
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
        runLeaseExpiresAt: new Date(Date.now() + IMPORT_JOB_LEASE_MS),
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
  await appendImportEvent({
    jobId,
    stage: InventoryImportEventStage.DONE,
    message: "Import parsing complete and ready for review.",
    meta: {
      pagesVisited,
      pagesParsed,
      candidatesFound: found,
      candidatesReady: ready,
      candidatesFailed: failed,
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
  const reviewUrl = base ? `${base}/my-items/bulk-add/${job.id}` : `/my-items/bulk-add/${job.id}`;
  const subject = success ? "Your bulk add is ready for review" : "Your bulk add ended with an error";
  const lines = success
    ? [
        `We finished scanning ${job.sourceUrl}.`,
        `${job.candidatesReady} candidate items are ready to review.`,
        "Open the review table to edit items, then publish.",
      ]
    : [`We could not finish scanning ${job.sourceUrl}.`, error ? `Error: ${error}` : "Please retry with a smaller page limit."];
  await dispatchUserNotification({
    user: job.user,
    eventType: success ? "inventory.import_complete" : "inventory.import_failed",
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

export async function publishImportJobCandidates(params: { userId: string; jobId: string }) {
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
    if (!c.name || !c.kind) {
      failed += 1;
      await getPrisma().inventoryImportCandidate.update({
        where: { id: c.id },
        data: { validationError: "Name and kind are required." },
      });
      continue;
    }
    const resolvedImageUrl = await mirrorHttpImageUrlToUploads({ userId: params.userId, imageUrl: c.imageUrl });
    if (resolvedImageUrl !== c.imageUrl) {
      await getPrisma().inventoryImportCandidate.update({
        where: { id: c.id },
        data: { imageUrl: resolvedImageUrl },
      });
    }

    const item = await getPrisma().inventoryItem.create({
      data: {
        userId: params.userId,
        kind: c.kind,
        name: c.name,
        description: (c.description ?? "").trim().slice(0, 8000),
        imageUrl: resolvedImageUrl,
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
