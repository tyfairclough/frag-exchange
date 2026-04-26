import Link from "next/link";
import {
  AI_SYSTEM_PROMPT_KEYS,
  type AiSystemPromptKey,
  getAiSystemPromptStoredOrDefault,
  labelForAiSystemPromptKey,
} from "@/lib/ai-system-prompt-registry";
import { MARKETING_CTA_GREEN, MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";
import { BackLink } from "@/components/back-link";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { resetAiSystemPromptAction, saveAllAiPromptsAction } from "./actions";

const INVENTORY_KEYS = AI_SYSTEM_PROMPT_KEYS.slice(0, 5);
const LISTING_AI_KEYS = AI_SYSTEM_PROMPT_KEYS.slice(5);

const FORM_ID = "ai-prompts-all";

function PromptField({
  promptKey,
  value,
}: {
  promptKey: AiSystemPromptKey;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 py-5 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <label htmlFor={promptKey} className="text-sm font-semibold text-slate-800">
          {labelForAiSystemPromptKey(promptKey)}
        </label>
        <form action={resetAiSystemPromptAction} className="shrink-0">
          <input type="hidden" name="key" value={promptKey} />
          <button
            type="submit"
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Use code default
          </button>
        </form>
      </div>
      <textarea
        id={promptKey}
        name={promptKey}
        form={FORM_ID}
        required
        rows={8}
        defaultValue={value}
        className="min-h-[8rem] w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-xs leading-relaxed text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 sm:text-sm"
        spellCheck={false}
      />
    </div>
  );
}

export default async function AiPromptsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; reset?: string }>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;

  const entries = await Promise.all(
    AI_SYSTEM_PROMPT_KEYS.map(async (key) => {
      const v = await getAiSystemPromptStoredOrDefault(key);
      return [key, v] as const;
    }),
  );
  const byKey = Object.fromEntries(entries) as Record<AiSystemPromptKey, string>;

  let errorMessage: string | null = null;
  if (params.error === "invalid") {
    errorMessage = "Invalid prompt key.";
  } else if (params.error) {
    errorMessage = decodeURIComponent(params.error);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <BackLink
            href="/admin"
            variant="text"
            className="mb-3 min-h-10 rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-700 no-underline transition hover:border-slate-400 hover:bg-slate-50"
            style={{ color: MARKETING_LINK_BLUE }}
          >
            Back to admin
          </BackLink>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
            AI system prompts
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            OpenAI system messages for inventory URL discovery, page parsing, and listing assistance. Values match the
            built-in defaults until you save overrides. Saving text identical to the code default removes the database
            row; you can also use &quot;Use code default&quot; on a single prompt.
          </p>
        </div>
      </div>

      {params.saved ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          All prompts saved.
        </div>
      ) : null}
      {params.reset ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          That prompt was reset to the code default.
        </div>
      ) : null}
      {errorMessage ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
        <strong className="font-semibold">NDJSON import prompts:</strong> include the literal token{" "}
        <code className="rounded bg-amber-100/80 px-1.5 py-0.5 font-mono text-xs">{"{{FIELDS_HINT}}"}</code> where the
        per-line JSON field shape should appear; it is expanded at runtime. Changing the expected JSON shape can break
        parsing until the application code is updated.
      </section>

      <form id={FORM_ID} action={saveAllAiPromptsAction} className="flex flex-col gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-800">Inventory import</h2>
          <p className="mt-1 text-sm text-slate-600">Retail crawl: anchor picking, JSON parse, and streaming NDJSON.</p>
          <div className="mt-2">
            {INVENTORY_KEYS.map((key) => (
              <PromptField key={key} promptKey={key} value={byKey[key]} />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-800">Listing and photo AI</h2>
          <p className="mt-1 text-sm text-slate-600">Coral text enrichment, coral photo colours, and multi-kind listing vision.</p>
          <div className="mt-2">
            {LISTING_AI_KEYS.map((key) => (
              <PromptField key={key} promptKey={key} value={byKey[key]} />
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-white transition hover:opacity-95 active:scale-[0.99]"
            style={{ backgroundColor: MARKETING_CTA_GREEN }}
          >
            Save all prompts
          </button>
        </div>
      </form>
    </div>
  );
}
