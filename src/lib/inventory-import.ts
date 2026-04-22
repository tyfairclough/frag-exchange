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
import { getAiSystemPrompt, getAiSystemPrompts } from "@/lib/ai-system-prompt-registry";
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

const MAX_IMPORT_JOB_ITEMS = 2000;

export async function createInventoryImportJob(params: {
  userId: string;
  sourceUrl: string;
  maxPages: number;
  maxItems?: number | null;
  maxDepth?: number;
}): Promise<{ id: string }> {
  const valid = canFetchSourceUrl(params.sourceUrl);
  if (!valid.ok) {
    throw new Error(valid.error);
  }
  const maxItems =
    params.maxItems == null
      ? null
      : Math.min(Math.max(Math.trunc(params.maxItems), 1), MAX_IMPORT_JOB_ITEMS);
  const dbPayload = {
    userId: params.userId,
    sourceUrl: valid.url.toString(),
    sourceHost: valid.url.host,
    maxPages: Math.min(Math.max(Math.trunc(params.maxPages), 0), 60),
    maxItems,
    /** Legacy column; crawl no longer uses depth — only listing pagination + linked product URLs. */
    maxDepth: Math.min(Math.max(params.maxDepth ?? 0, 0), 3),
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

/** Pagination only — same-origin, non-asset targets (next page, rel=next, common shop patterns). */
function extractPaginationLinks(origin: string, resolvedPageUrl: string, html: string): string[] {
  const base = new URL(resolvedPageUrl);
  const out = new Set<string>();

  const push = (raw: string | undefined) => {
    if (!raw) return;
    try {
      const u = new URL(raw.trim().replace(/&amp;/g, "&"), base);
      if (u.origin !== origin) return;
      if (isLikelyStaticAssetUrl(u)) return;
      u.hash = "";
      if (u.href === base.href) return;
      out.add(u.href);
    } catch {
      /* ignore */
    }
  };

  const linkRelNext =
    /<link\b[^>]*\brel\s*=\s*["']next["'][^>]*>/gi;
  let lm: RegExpExecArray | null;
  while ((lm = linkRelNext.exec(html))) {
    const tag = lm[0];
    const hrefM = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (hrefM) push(hrefM[1]);
  }
  const linkHrefFirst =
    /<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*\brel\s*=\s*["']next["'][^>]*>/gi;
  while ((lm = linkHrefFirst.exec(html))) {
    push(lm[1]);
  }

  const aTagRe = /<a\b([^>]+)>/gi;
  while ((lm = aTagRe.exec(html))) {
    const attrs = lm[1];
    const relNext = /\brel\s*=\s*["']next["']/i.test(attrs);
    const classNext =
      /\bclass\s*=\s*["'][^"']*\b(next|pagination__next|pagination-next|pager__next|page-next|wc-forward)\b[^"']*["']/i.test(
        attrs,
      );
    const ariaNext =
      /\baria-label\s*=\s*["'][^"']*\b(next\s+page|go\s+to\s+next|older\s+posts?)\b[^"']*["']/i.test(attrs) ||
      /\baria-label\s*=\s*["'][^"']*›[^"']*["']/i.test(attrs);
    if (!relNext && !classNext && !ariaNext) continue;
    const hrefM = /\bhref\s*=\s*["']([^"']+)["']/i.exec(attrs);
    if (hrefM) push(hrefM[1]);
  }

  return [...out];
}

const MAX_ANCHOR_HINTS = 300;

/**
 * Same-origin, non-asset anchors with their visible text. Feeds the AI link-discovery step so the
 * model can only choose exact existing hrefs as product detail URLs (never invent).
 */
function extractAnchorHintsFromHtml(
  html: string,
  pageUrl: string,
  origin: string,
): Array<{ href: string; text: string }> {
  const seen = new Set<string>();
  const pageHref = (() => {
    try {
      const u = new URL(pageUrl);
      u.hash = "";
      return u.href;
    } catch {
      return pageUrl;
    }
  })();
  const out: Array<{ href: string; text: string }> = [];
  const aRe = /<a\b([^>]*?)>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null = aRe.exec(html);
  while (m !== null) {
    if (out.length >= MAX_ANCHOR_HINTS) break;
    const attrs = m[1];
    const inner = m[2];
    const hrefM = /\bhref\s*=\s*["']([^"']+)["']/i.exec(attrs);
    if (!hrefM) {
      m = aRe.exec(html);
      continue;
    }
    let u: URL;
    try {
      u = new URL(hrefM[1].trim().replace(/&amp;/g, "&"), pageUrl);
    } catch {
      m = aRe.exec(html);
      continue;
    }
    if (u.origin !== origin || isLikelyStaticAssetUrl(u)) {
      m = aRe.exec(html);
      continue;
    }
    u.hash = "";
    if (u.href === pageHref) {
      m = aRe.exec(html);
      continue;
    }
    const href = u.href;
    if (seen.has(href)) {
      m = aRe.exec(html);
      continue;
    }
    seen.add(href);
    const text = stripHtml(inner).slice(0, 160);
    out.push({ href, text });
    m = aRe.exec(html);
  }
  return out;
}

/**
 * Ask the AI to pick product-detail URLs out of the anchors we extracted. Must return only hrefs
 * that appear verbatim in the input list; anything else is discarded by the caller.
 */
async function discoverDetailLinksWithAi(params: {
  pageText: string;
  anchors: Array<{ href: string; text: string }>;
  pageUrl: string;
}): Promise<string[]> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || params.anchors.length === 0) return [];
  const model = process.env.CORAL_AI_MODEL?.trim() || "gpt-4o-mini";
  const anchorLines = params.anchors
    .map((a, i) => `${i + 1}. ${a.href}${a.text ? ` — ${a.text}` : ""}`)
    .join("\n");
  const anchorBlock = `\n\nANCHOR_CANDIDATES (${params.anchors.length} same-origin links on this page — pick from these exact hrefs only):\n${anchorLines}\n`;
  const maxCore = Math.max(400, MAX_AI_TEXT_LENGTH - anchorBlock.length);
  const core = params.pageText.length > maxCore ? params.pageText.slice(0, maxCore) : params.pageText;
  const system = await getAiSystemPrompt("inventory_discover_detail_links");
  const userMessage = `Page URL: ${params.pageUrl}\n\nPAGE TEXT:\n${core}${anchorBlock}`;

  const ac = new AbortController();
  let raceTimer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    raceTimer = setTimeout(() => {
      try {
        ac.abort();
      } catch {
        /* ignore */
      }
      reject(new Error("openai_discover_timeout"));
    }, OPENAI_COMPLETION_TIMEOUT_MS);
  });
  const fetchPromise = fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: ac.signal,
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    }),
  });

  let res: Response;
  try {
    res = await Promise.race([
      fetchPromise.finally(() => {
        if (raceTimer !== undefined) clearTimeout(raceTimer);
      }),
      timeoutPromise,
    ]);
  } catch {
    return [];
  }
  if (!res.ok) return [];
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content;
  if (!content) return [];
  let parsed: { detailUrls?: unknown };
  try {
    parsed = JSON.parse(content) as { detailUrls?: unknown };
  } catch {
    return [];
  }
  const arr = Array.isArray(parsed.detailUrls) ? parsed.detailUrls : [];
  const allowedHrefs = new Set(params.anchors.map((a) => a.href));
  const out = new Set<string>();
  for (const u of arr) {
    if (typeof u !== "string") continue;
    const t = u.trim();
    if (!t || !allowedHrefs.has(t)) continue;
    out.add(t);
  }
  return [...out];
}

type FetchedPage = { html: string; finalUrl: string; isHtml: boolean };

async function fetchPage(url: string): Promise<FetchedPage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "REEFxCHANGEBot/1.0 (+inventory import)" },
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

async function parseCandidatesWithAi(
  text: string,
  pageUrl: string,
  mode: "listing" | "detail" = "listing",
): Promise<ParsedCandidate[]> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return [];
  const model = process.env.CORAL_AI_MODEL?.trim() || "gpt-4o-mini";
  const payload = text.length > MAX_AI_TEXT_LENGTH ? text.slice(0, MAX_AI_TEXT_LENGTH) : text;
  const { inventory_parse_listing_json: systemListing, inventory_parse_detail_json: systemDetail } =
    await getAiSystemPrompts(["inventory_parse_listing_json", "inventory_parse_detail_json"]);
  const bodyStr = JSON.stringify({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: mode === "detail" ? systemDetail : systemListing,
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
  } catch {
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

function isParsedCandidateShape(value: unknown): value is ParsedCandidate {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  const k = o.kind;
  if (k !== "CORAL" && k !== "FISH" && k !== "IGNORE") return false;
  return true;
}

async function upsertOneInventoryImportCandidateFromAi(params: {
  jobId: string;
  userId: string;
  pageUrl: string;
  item: ParsedCandidate;
}): Promise<{ found: number; ready: number }> {
  const { jobId, userId, pageUrl, item } = params;
  if (item.kind !== "CORAL" && item.kind !== "FISH") {
    await appendImportEvent({
      jobId,
      stage: InventoryImportEventStage.SKIP,
      message: "Skipped non-fish/non-coral candidate.",
      meta: { url: pageUrl, kind: item.kind, title: item.title ?? null },
    });
    return { found: 0, ready: 0 };
  }
  const name = item.name?.trim();
  if (!name) {
    await appendImportEvent({
      jobId,
      stage: InventoryImportEventStage.SKIP,
      level: InventoryImportEventLevel.WARN,
      message: "Skipped candidate without name.",
      meta: { url: pageUrl, kind: item.kind },
    });
    return { found: 0, ready: 0 };
  }
  const sourceHash = makeSourceHash(pageUrl, name, item.kind);
  const salePriceMinor = Number.isInteger(item.salePriceMinor) && (item.salePriceMinor ?? 0) > 0 ? (item.salePriceMinor as number) : 100;
  const saleCurrencyCode = (item.saleCurrencyCode || "GBP").toUpperCase().slice(0, 3);
  const saleExternalUrl = item.saleExternalUrl?.trim() || pageUrl;
  const mirroredImageUrl = await mirrorHttpImageUrlToUploads({
    userId,
    imageUrl: item.imageUrl || null,
  });
  await getPrisma().inventoryImportCandidate.upsert({
    where: { jobId_sourceHash: { jobId, sourceHash } },
    create: {
      jobId,
      userId,
      sourcePageUrl: pageUrl,
      sourceHash,
      title: item.title?.slice(0, 240) || null,
      snippet: item.snippet || null,
      kind: item.kind === "CORAL" ? InventoryKind.CORAL : InventoryKind.FISH,
      confidenceScore: Math.max(0, Math.min(1, Number(item.confidence) || 0.4)),
      name: name.slice(0, 120),
      description: (item.description?.trim() || "").slice(0, 8000) || null,
      imageUrl: mirroredImageUrl,
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
      imageUrl: mirroredImageUrl,
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
  await appendImportEvent({
    jobId,
    stage: InventoryImportEventStage.UPSERT_CANDIDATE,
    message: "Saved parsed candidate.",
    meta: {
      url: pageUrl,
      kind: item.kind,
      name: name.slice(0, 120),
      confidence: Number(item.confidence) || null,
    },
  });
  return { found: 1, ready: 1 };
}

async function upsertInventoryImportCandidatesFromAi(params: {
  jobId: string;
  userId: string;
  pageUrl: string;
  aiItems: ParsedCandidate[];
  /** Running total before this batch; stop when initialFound + batchFound reaches maxFound. */
  initialFound?: number;
  maxFound?: number | null;
}): Promise<{ found: number; ready: number }> {
  const { jobId, userId, pageUrl, aiItems } = params;
  const initialFound = params.initialFound ?? 0;
  const maxFound = params.maxFound ?? null;
  let found = 0;
  let ready = 0;
  for (const item of aiItems) {
    if (maxFound != null && initialFound + found >= maxFound) break;
    const u = await upsertOneInventoryImportCandidateFromAi({ jobId, userId, pageUrl, item });
    found += u.found;
    ready += u.ready;
  }
  return { found, ready };
}

/** Optional counters for SSE reader diagnostics. */
type SseReaderDebugStats = {
  rawLinesSeen: number;
  dataLinesParsed: number;
  deltaBytes: number;
  firstNonDataLinePrefix: string | null;
};

/**
 * Reads Chat Completions SSE, forwards assistant text deltas, splits NDJSON lines as they complete, and awaits the handler per line.
 */
async function readSseAndDispatchNdjsonLines(
  body: ReadableStream<Uint8Array>,
  onAssistantDelta: (delta: string) => void,
  onNdjsonLine: (item: ParsedCandidate) => Promise<void>,
  sseDebug?: SseReaderDebugStats,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";
  let ndjsonBuffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      sseBuffer += decoder.decode(value, { stream: true });
      const sseParts = sseBuffer.split("\n");
      sseBuffer = sseParts.pop() ?? "";
      for (const rawLine of sseParts) {
        const line = rawLine.replace(/\r$/, "").trimEnd();
        if (sseDebug) sseDebug.rawLinesSeen += 1;
        if (!line.startsWith("data:")) {
          if (sseDebug && !sseDebug.firstNonDataLinePrefix && line.trim()) {
            sseDebug.firstNonDataLinePrefix = line.slice(0, 120);
          }
          continue;
        }
        if (sseDebug) sseDebug.dataLinesParsed += 1;
        const data = line.slice(line.indexOf(":") + 1).trimStart();
        if (data === "[DONE]") continue;
        let json: { choices?: Array<{ delta?: { content?: string } }> };
        try {
          json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
        } catch {
          continue;
        }
        const d = json.choices?.[0]?.delta?.content;
        if (!d) continue;
        if (sseDebug) sseDebug.deltaBytes += d.length;
        onAssistantDelta(d);
        ndjsonBuffer += d;
        const lines = ndjsonBuffer.split("\n");
        ndjsonBuffer = lines.pop() ?? "";
        for (const raw of lines) {
          const trimmed = raw.trim();
          if (!trimmed) continue;
          let obj: unknown;
          try {
            obj = JSON.parse(trimmed) as unknown;
          } catch {
            continue;
          }
          if (!isParsedCandidateShape(obj)) continue;
          await onNdjsonLine(obj);
        }
      }
    }
    const tailSse = sseBuffer.replace(/\r$/, "").trimEnd();
    if (tailSse.startsWith("data:")) {
      const data = tailSse.slice(tailSse.indexOf(":") + 1).trimStart();
      if (data !== "[DONE]") {
        try {
          const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
          const d = json.choices?.[0]?.delta?.content;
          if (d) {
            if (sseDebug) sseDebug.deltaBytes += d.length;
            onAssistantDelta(d);
            ndjsonBuffer += d;
            const tailLines = ndjsonBuffer.split("\n");
            ndjsonBuffer = tailLines.pop() ?? "";
            for (const raw of tailLines) {
              const trimmed = raw.trim();
              if (!trimmed) continue;
              let obj: unknown;
              try {
                obj = JSON.parse(trimmed) as unknown;
              } catch {
                continue;
              }
              if (!isParsedCandidateShape(obj)) continue;
              await onNdjsonLine(obj);
            }
          }
        } catch {
          /* ignore */
        }
      }
    }
    const tail = ndjsonBuffer.trim();
    if (tail) {
      try {
        const obj = JSON.parse(tail) as unknown;
        if (isParsedCandidateShape(obj)) {
          await onNdjsonLine(obj);
        }
      } catch {
        /* incomplete tail */
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Streams NDJSON lines from OpenAI; invokes onParsedLine for each complete line that parses as a candidate.
 */
async function streamNdjsonCandidatesFromOpenAi(params: {
  modelInput: string;
  pageUrl: string;
  mode: "listing" | "detail";
  signal: AbortSignal;
  onParsedLine: (item: ParsedCandidate) => Promise<void>;
}): Promise<{ ndjsonLinesAccepted: number; rawAssistant: string; streamFailed: boolean }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return { ndjsonLinesAccepted: 0, rawAssistant: "", streamFailed: true };
  }
  const model = process.env.CORAL_AI_MODEL?.trim() || "gpt-4o-mini";
  const payload =
    params.modelInput.length > MAX_AI_TEXT_LENGTH ? params.modelInput.slice(0, MAX_AI_TEXT_LENGTH) : params.modelInput;
  const { inventory_stream_listing_ndjson: systemListing, inventory_stream_detail_ndjson: systemDetail } =
    await getAiSystemPrompts(["inventory_stream_listing_ndjson", "inventory_stream_detail_ndjson"]);
  const system = params.mode === "detail" ? systemDetail : systemListing;
  const bodyStr = JSON.stringify({
    model,
    temperature: 0.2,
    stream: true,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Page URL: ${params.pageUrl}\n\nPAGE TEXT:\n${payload}` },
    ],
  });

  let rawAssistant = "";
  let ndjsonLinesAccepted = 0;

  const ac = new AbortController();
  const abortRace = () => {
    try {
      ac.abort();
    } catch {
      /* ignore */
    }
  };
  if (params.signal.aborted) {
    return { ndjsonLinesAccepted: 0, rawAssistant: "", streamFailed: true };
  }
  const onUpstreamAbort = () => abortRace();
  params.signal.addEventListener("abort", onUpstreamAbort);

  let raceTimer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    raceTimer = setTimeout(() => {
      abortRace();
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
  } catch {
    params.signal.removeEventListener("abort", onUpstreamAbort);
    return { ndjsonLinesAccepted: 0, rawAssistant, streamFailed: true };
  } finally {
    params.signal.removeEventListener("abort", onUpstreamAbort);
  }

  if (!res.ok || !res.body) {
    return { ndjsonLinesAccepted: 0, rawAssistant: "", streamFailed: true };
  }

  const sseDebug: SseReaderDebugStats = {
    rawLinesSeen: 0,
    dataLinesParsed: 0,
    deltaBytes: 0,
    firstNonDataLinePrefix: null,
  };
  try {
    await readSseAndDispatchNdjsonLines(
      res.body,
      (delta) => {
        rawAssistant += delta;
      },
      async (item) => {
        ndjsonLinesAccepted += 1;
        await params.onParsedLine(item);
      },
      sseDebug,
    );
  } catch {
    return { ndjsonLinesAccepted, rawAssistant, streamFailed: true };
  }

  return { ndjsonLinesAccepted, rawAssistant, streamFailed: false };
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
      maxItems: true,
      attemptCount: true,
    },
  });
  if (!job) return;
  const origin = new URL(job.sourceUrl).origin;
  const itemCap = job.maxItems;
  const capReached = () => itemCap != null && found >= itemCap;
  const listingQueue: string[] = [job.sourceUrl];
  const listingEnqueued = new Set<string>([job.sourceUrl]);
  const listingSeen = new Set<string>();
  const detailDiscovered = new Set<string>();
  let listingPagesFetched = 0;
  let pagesVisited = 0;
  let pagesParsed = 0;
  let found = 0;
  let ready = 0;
  let failed = 0;

  const unlimitedListingPages = job.maxPages === 0;
  while (listingQueue.length > 0 && (unlimitedListingPages || listingPagesFetched < job.maxPages) && !capReached()) {
    const nextUrl = listingQueue.shift();
    if (!nextUrl) break;
    if (listingSeen.has(nextUrl)) continue;
    listingSeen.add(nextUrl);
    listingPagesFetched += 1;
    pagesVisited += 1;
    await extendImportJobLease(jobId, runToken);
    await appendImportEvent({
      jobId,
      stage: InventoryImportEventStage.REQUEST_PAGE,
      message: unlimitedListingPages
        ? `Requesting listing page ${listingPagesFetched} (no page limit).`
        : `Requesting listing page ${listingPagesFetched}/${job.maxPages}.`,
      meta: { url: nextUrl, phase: "listing" as const },
    });
    try {
      const fetched = await fetchPage(nextUrl);
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

      const anchors = extractAnchorHintsFromHtml(fetched.html, fetched.finalUrl, origin).filter(
        (a) => !listingEnqueued.has(a.href) && !detailDiscovered.has(a.href),
      );

      if (capReached()) {
        await appendImportEvent({
          jobId,
          stage: InventoryImportEventStage.SKIP,
          message: "Item cap reached — skipping AI link discovery on listing page.",
          meta: { url: fetched.finalUrl },
        });
      } else if (anchors.length === 0) {
        await appendImportEvent({
          jobId,
          stage: InventoryImportEventStage.SKIP,
          message: "No crawlable product links found on listing page.",
          meta: { url: fetched.finalUrl },
        });
      } else {
        pagesParsed += 1;
        await appendImportEvent({
          jobId,
          stage: InventoryImportEventStage.AI_CLASSIFY,
          message: `Asking AI to identify product detail links from ${anchors.length} candidate anchor(s).`,
          meta: { url: fetched.finalUrl, anchorCount: anchors.length },
        });
        await extendImportJobLease(jobId, runToken);
        const discovered = await discoverDetailLinksWithAi({
          pageText: text,
          anchors,
          pageUrl: fetched.finalUrl,
        });
        let newlyAdded = 0;
        for (const href of discovered) {
          let u: URL;
          try {
            u = new URL(href, fetched.finalUrl);
          } catch {
            continue;
          }
          if (u.origin !== origin || isLikelyStaticAssetUrl(u)) continue;
          u.hash = "";
          if (listingEnqueued.has(u.href) || detailDiscovered.has(u.href)) continue;
          detailDiscovered.add(u.href);
          newlyAdded += 1;
        }
        await appendImportEvent({
          jobId,
          stage: InventoryImportEventStage.AI_CLASSIFY,
          message: `AI identified ${newlyAdded} new product detail link(s).`,
          meta: {
            url: fetched.finalUrl,
            proposed: discovered.length,
            newlyAdded,
            totalDiscovered: detailDiscovered.size,
          },
        });
      }

      if (!capReached()) {
        for (const p of extractPaginationLinks(origin, fetched.finalUrl, fetched.html)) {
          if (!listingEnqueued.has(p)) {
            listingEnqueued.add(p);
            listingQueue.push(p);
          }
        }
      }
    } catch (e) {
      failed += 1;
      const message = e instanceof Error ? e.message : String(e);
      const errSourceHash = makeSourceHash(nextUrl, `parse-error-${pagesVisited}`, "IGNORE");
      await appendImportEvent({
        jobId,
        stage: InventoryImportEventStage.FAIL,
        level: InventoryImportEventLevel.ERROR,
        message: "Page processing failed.",
        meta: { url: nextUrl, error: message.slice(0, 500) },
      });
      await getPrisma().inventoryImportCandidate.create({
        data: {
          jobId,
          userId: job.userId,
          sourcePageUrl: nextUrl,
          sourceHash: errSourceHash,
          parseError: message.slice(0, 3000),
          saleExternalUrl: nextUrl,
        },
      });
    }
    await getPrisma().inventoryImportJob.updateMany({
      where: { id: jobId, runToken },
      data: {
        pagesVisited,
        pagesParsed,
        detailUrlsDiscovered: detailDiscovered.size,
        candidatesFound: found,
        candidatesReady: ready,
        candidatesFailed: failed,
        runLeaseExpiresAt: new Date(Date.now() + IMPORT_JOB_LEASE_MS),
      },
    });
  }

  const detailUrls = [...detailDiscovered].filter((u) => !listingEnqueued.has(u));
  const detailSeen = new Set<string>();
  let detailIndex = 0;
  let detailProcessed = 0;
  for (const detailUrl of detailUrls) {
    if (capReached()) break;
    if (detailSeen.has(detailUrl)) continue;
    detailSeen.add(detailUrl);
    detailIndex += 1;
    pagesVisited += 1;
    detailProcessed += 1;
    const foundBeforeDetail = found;
    await extendImportJobLease(jobId, runToken);
    await appendImportEvent({
      jobId,
      stage: InventoryImportEventStage.REQUEST_PAGE,
      message: `Requesting product page ${detailIndex}/${detailUrls.length}.`,
      meta: { url: detailUrl, phase: "detail" as const },
    });
    try {
      const fetched = await fetchPage(detailUrl);
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
        const detailStreamAc = new AbortController();
        const detailStreamResult = await streamNdjsonCandidatesFromOpenAi({
          modelInput,
          pageUrl: fetched.finalUrl,
          mode: "detail",
          signal: detailStreamAc.signal,
          onParsedLine: async (item) => {
            if (capReached()) return;
            const upserted = await upsertOneInventoryImportCandidateFromAi({
              jobId,
              userId: job.userId,
              pageUrl: fetched.finalUrl,
              item,
            });
            found += upserted.found;
            ready += upserted.ready;
            if (capReached()) detailStreamAc.abort();
            await extendImportJobLease(jobId, runToken);
          },
        });
        const detailNeedsFallback = detailStreamResult.ndjsonLinesAccepted === 0;
        if (detailNeedsFallback) {
          if (!capReached()) {
            const detailItems = await parseCandidatesWithAi(modelInput, fetched.finalUrl, "detail");
            await appendImportEvent({
              jobId,
              stage: InventoryImportEventStage.AI_CLASSIFY,
              message: "AI classification completed (batch fallback).",
              meta: { url: fetched.finalUrl, returnedItems: detailItems.length },
            });
            const upserted = await upsertInventoryImportCandidatesFromAi({
              jobId,
              userId: job.userId,
              pageUrl: fetched.finalUrl,
              aiItems: detailItems,
              initialFound: found,
              maxFound: itemCap,
            });
            found += upserted.found;
            ready += upserted.ready;
          } else {
            await appendImportEvent({
              jobId,
              stage: InventoryImportEventStage.SKIP,
              message: "Skipped product batch fallback (item limit already reached).",
              meta: { url: fetched.finalUrl },
            });
          }
        } else {
          await appendImportEvent({
            jobId,
            stage: InventoryImportEventStage.AI_CLASSIFY,
            message: "AI classification completed.",
            meta: { url: fetched.finalUrl, returnedItems: detailStreamResult.ndjsonLinesAccepted },
          });
        }
        /** Treat a parsed detail page that yielded zero saved candidates as an error — shows up in Errors count and the activity feed. */
        if (found === foundBeforeDetail && !capReached()) {
          failed += 1;
          await appendImportEvent({
            jobId,
            stage: InventoryImportEventStage.FAIL,
            level: InventoryImportEventLevel.ERROR,
            message: "No items confidently found on product page.",
            meta: { url: fetched.finalUrl },
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
    } catch (e) {
      failed += 1;
      const message = e instanceof Error ? e.message : String(e);
      const errSourceHash = makeSourceHash(detailUrl, `detail-error-${pagesVisited}`, "IGNORE");
      await appendImportEvent({
        jobId,
        stage: InventoryImportEventStage.FAIL,
        level: InventoryImportEventLevel.ERROR,
        message: "Product page processing failed.",
        meta: { url: detailUrl, error: message.slice(0, 500) },
      });
      await getPrisma().inventoryImportCandidate.create({
        data: {
          jobId,
          userId: job.userId,
          sourcePageUrl: detailUrl,
          sourceHash: errSourceHash,
          parseError: message.slice(0, 3000),
          saleExternalUrl: detailUrl,
        },
      });
    }
    await getPrisma().inventoryImportJob.updateMany({
      where: { id: jobId, runToken },
      data: {
        pagesVisited,
        pagesParsed,
        detailUrlsDiscovered: detailDiscovered.size,
        detailUrlsProcessed: detailProcessed,
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
      detailUrlsDiscovered: detailDiscovered.size,
      detailUrlsProcessed: detailProcessed,
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
    message:
      itemCap != null && found >= itemCap
        ? `Import stopped after ${found} saved item(s) (limit ${itemCap}). Ready for review.`
        : "Import parsing complete and ready for review.",
    meta: {
      pagesVisited,
      pagesParsed,
      detailUrlsDiscovered: detailDiscovered.size,
      detailUrlsProcessed: detailProcessed,
      candidatesFound: found,
      candidatesReady: ready,
      candidatesFailed: failed,
      itemCap: itemCap ?? null,
      stoppedForItemCap: itemCap != null && found >= itemCap,
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

export async function publishImportJobCandidates(params: {
  userId: string;
  jobId: string;
  candidateIds?: string[];
}) {
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
      ...(params.candidateIds && params.candidateIds.length > 0
        ? { id: { in: params.candidateIds } }
        : {}),
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

  /** Only flip the job to COMPLETED when every remaining candidate has been handled; otherwise keep it in review so the user can continue picking rows. */
  const remaining = await getPrisma().inventoryImportCandidate.count({
    where: {
      jobId: params.jobId,
      userId: params.userId,
      createdItemId: null,
      kind: { in: [InventoryKind.CORAL, InventoryKind.FISH] },
    },
  });
  if (remaining === 0) {
    await getPrisma().inventoryImportJob.update({
      where: { id: params.jobId },
      data: { status: InventoryImportJobStatus.COMPLETED, finishedAt: new Date() },
    });
  }
  return { createdCount: created.length, failedCount: failed };
}
