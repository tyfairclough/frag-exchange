"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { completeOnboardingAction } from "@/app/onboarding/actions";
import { IdealPostcodesAddressLookup } from "@/app/onboarding/ideal-postcodes-address-lookup";
import { MARKETING_CTA_GREEN, MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";

const avatarChoices = ["🐠", "🪸", "🐙", "🦀", "🐡", "🐟", "🦐", "🪼"] as const;
const TOTAL_STEPS = 4;

type WizardValues = {
  alias: string;
  avatarEmoji: string;
  tosAccepted: boolean;
  privacyAccepted: boolean;
  line1: string;
  line2: string;
  town: string;
  region: string;
  postalCode: string;
  countryCode: string;
};

function Progress({ step }: { step: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-500">
        <span>Step {step} of 4</span>
        <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%`, backgroundColor: MARKETING_CTA_GREEN }}
        />
      </div>
    </div>
  );
}

export function OnboardingWizard({
  aliasWordsInsufficient,
  initialValues,
  initialError,
  suggestedAlias,
}: {
  aliasWordsInsufficient: boolean;
  initialValues: WizardValues;
  initialError?: string;
  suggestedAlias: string;
}) {
  const [step, setStep] = useState<number>(1);
  const [values, setValues] = useState<WizardValues>(initialValues);
  const [clientError, setClientError] = useState<string | null>(null);
  const errorMessage = useMemo(() => {
    if (clientError) {
      return clientError;
    }
    if (initialError === "tos") {
      return "You need to accept the Terms of Service to continue.";
    }
    if (initialError === "privacy") {
      return "You need to acknowledge the privacy notice to continue.";
    }
    if (initialError === "address") {
      return "If you add an address, complete line 1, town, postal code, and country code.";
    }
    if (initialError === "alias-words") {
      return "Default aliases are not available right now. Please type your own alias below, or ask an operator to restore the word list.";
    }
    if (initialError === "alias-taken") {
      return "That alias is already taken. Choose a different one.";
    }
    if (initialError === "alias-length") {
      return "Alias must be 80 characters or fewer.";
    }
    return null;
  }, [clientError, initialError]);

  function next() {
    setClientError(null);
    if (step === 1) {
      if (!values.tosAccepted || !values.privacyAccepted) {
        setClientError("Please accept both legal checkboxes before continuing.");
        return;
      }
    }
    if (step === 2 && values.alias.length > 80) {
      setClientError("Alias must be 80 characters or fewer.");
      return;
    }
    if (step === 2 && aliasWordsInsufficient && !values.alias.trim()) {
      setClientError("Please enter an alias to continue.");
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function agreeAndContinue() {
    setClientError(null);
    setValues((v) => ({ ...v, tosAccepted: true, privacyAccepted: true }));
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function previous() {
    setClientError(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  return (
    <main className="min-h-dvh bg-slate-100/80 px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-lg">
        <section className="rounded-3xl border border-slate-200/80 bg-white px-5 py-6 shadow-sm sm:px-7 sm:py-7">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: MARKETING_NAVY }}>
            Welcome to REEFxCHANGE
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Welcome aboard! Let&apos;s get you setup, this only takes a minute.
          </p>
          <div className="mt-5">
            <Progress step={step} />
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
          ) : null}

          {step === 1 ? (
            <div className="mt-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold leading-tight" style={{ color: MARKETING_NAVY }}>
                  The boring stuff
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  REEFxCHANGE won&apos;t sell your data and follows GDPR regulations.
                </p>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-3">
                <input
                  type="checkbox"
                  checked={values.tosAccepted}
                  onChange={(e) => setValues((v) => ({ ...v, tosAccepted: e.target.checked }))}
                  className="mt-1"
                />
                <span className="text-sm leading-relaxed text-slate-700">
                  I accept the{" "}
                  <Link href="/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color: MARKETING_LINK_BLUE }}>
                    Terms of Service
                  </Link>
                  .
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-3">
                <input
                  type="checkbox"
                  checked={values.privacyAccepted}
                  onChange={(e) => setValues((v) => ({ ...v, privacyAccepted: e.target.checked }))}
                  className="mt-1"
                />
                <span className="text-sm leading-relaxed text-slate-700">
                  I have read the{" "}
                  <Link href="/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: MARKETING_LINK_BLUE }}>
                    Privacy Notice
                  </Link>
                  .
                </span>
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mt-6 space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold" style={{ color: MARKETING_NAVY }}>
                  Pick your alias
                </h2>
                <p className="text-xs text-slate-500">This is how other reefers will see you.</p>
              </div>
              {aliasWordsInsufficient ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Suggested aliases are unavailable. Please choose your own alias to continue.
                </div>
              ) : null}
              <input
                value={values.alias}
                onChange={(e) => setValues((v) => ({ ...v, alias: e.target.value }))}
                maxLength={80}
                placeholder={suggestedAlias || "Your alias"}
                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-sky-500"
              />
              {!aliasWordsInsufficient && suggestedAlias ? (
                <p className="text-xs text-slate-500">Leave blank to use the suggested name shown in the field.</p>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="mt-6 space-y-4">
              <h2 className="text-lg font-semibold" style={{ color: MARKETING_NAVY }}>
                Choose your avatar
              </h2>
              <div className="grid grid-cols-4 gap-2">
                {avatarChoices.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setValues((v) => ({ ...v, avatarEmoji: emoji }))}
                    className="rounded-xl border px-2 py-3 text-2xl transition"
                    style={{
                      borderColor: values.avatarEmoji === emoji ? MARKETING_LINK_BLUE : "#CBD5E1",
                      backgroundColor: values.avatarEmoji === emoji ? "#DBEAFE" : "white",
                    }}
                    aria-pressed={values.avatarEmoji === emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="mt-6 space-y-3">
              <h2 className="text-lg font-semibold" style={{ color: MARKETING_NAVY }}>
                Postal address (optional)
              </h2>
              <p className="text-sm text-slate-600">
                If you want to exchange coral by post, you will need to supply an address. You can do this later.
              </p>
              <IdealPostcodesAddressLookup
                initialValues={{
                  line1: values.line1,
                  line2: values.line2,
                  town: values.town,
                  region: values.region,
                  postalCode: values.postalCode,
                  countryCode: values.countryCode,
                }}
                value={{
                  line1: values.line1,
                  line2: values.line2,
                  town: values.town,
                  region: values.region,
                  postalCode: values.postalCode,
                  countryCode: values.countryCode,
                }}
                onAddressChange={(addr) => setValues((v) => ({ ...v, ...addr }))}
              />
            </div>
          ) : null}

          <div className="mt-6 flex items-center gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={previous}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Back
              </button>
            ) : null}
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={step === 1 ? agreeAndContinue : next}
                className="ml-auto rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: MARKETING_CTA_GREEN }}
              >
                {step === 1 ? "Agree and continue" : "Continue"}
              </button>
            ) : (
              <form action={completeOnboardingAction} className="ml-auto">
                {values.tosAccepted ? <input type="hidden" name="tosAccepted" value="on" /> : null}
                {values.privacyAccepted ? <input type="hidden" name="privacyAccepted" value="on" /> : null}
                <input type="hidden" name="alias" value={values.alias} />
                <input type="hidden" name="suggestedAlias" value={suggestedAlias} />
                <input type="hidden" name="avatarEmoji" value={values.avatarEmoji} />
                <input type="hidden" name="line1" value={values.line1} />
                <input type="hidden" name="line2" value={values.line2} />
                <input type="hidden" name="town" value={values.town} />
                <input type="hidden" name="region" value={values.region} />
                <input type="hidden" name="postalCode" value={values.postalCode} />
                <input type="hidden" name="countryCode" value={values.countryCode} />
                <button
                  type="submit"
                  disabled={aliasWordsInsufficient && !values.alias.trim()}
                  className="rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: MARKETING_CTA_GREEN }}
                >
                  Complete onboarding
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

