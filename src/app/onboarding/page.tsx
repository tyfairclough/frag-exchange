import { completeOnboardingAction } from "@/app/onboarding/actions";
import { OnboardingWizard } from "@/app/onboarding/onboarding-wizard";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MARKETING_CTA_GREEN, MARKETING_MUTED_BOX, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string; next?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const mode = params.mode === "address" ? "address" : "wizard";

  if (mode !== "address" && user.onboardingCompletedAt) {
    redirect("/");
  }
  const addr = user.address;

  if (mode === "address") {
    const nextPath = typeof params.next === "string" ? params.next : "/me";
    return (
      <main className="min-h-dvh bg-slate-100/80 px-4 py-6 sm:py-10">
        <div className="mx-auto w-full max-w-lg">
          <section className="rounded-3xl border border-slate-200/80 bg-white px-5 py-6 shadow-sm sm:px-7 sm:py-7">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: MARKETING_NAVY }}>
              Add your postal address
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Group exchanges require postal details before listing or trading.
            </p>
            {params.error === "address" || params.error === "address-required-group" ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Please complete line 1, town, postal code, and two-letter country code.
              </div>
            ) : null}
            <form action={completeOnboardingAction} className="mt-5 space-y-3">
              <input type="hidden" name="mode" value="address" />
              <input type="hidden" name="next" value={nextPath} />
              <div className="space-y-2 rounded-xl px-3 py-3" style={{ backgroundColor: MARKETING_MUTED_BOX }}>
                <input name="line1" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" placeholder="Address line 1" defaultValue={addr?.line1 ?? ""} />
                <input
                  name="line2"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  placeholder="Address line 2 (optional)"
                  defaultValue={addr?.line2 ?? ""}
                />
                <input name="town" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" placeholder="Town / city" defaultValue={addr?.town ?? ""} />
                <input
                  name="region"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  placeholder="County / region (optional)"
                  defaultValue={addr?.region ?? ""}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    name="postalCode"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    placeholder="Postal code"
                    defaultValue={addr?.postalCode ?? ""}
                  />
                  <input
                    name="countryCode"
                    maxLength={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 uppercase"
                    placeholder="GB"
                    defaultValue={addr?.countryCode ?? ""}
                  />
                </div>
              </div>
              <button type="submit" className="w-full rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: MARKETING_CTA_GREEN }}>
                Save and continue
              </button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  return (
    <OnboardingWizard
      initialError={params.error}
      initialValues={{
        alias: user.alias ?? "",
        avatarEmoji: user.avatarEmoji ?? "🐠",
        tosAccepted: false,
        privacyAccepted: false,
        line1: addr?.line1 ?? "",
        line2: addr?.line2 ?? "",
        town: addr?.town ?? "",
        region: addr?.region ?? "",
        postalCode: addr?.postalCode ?? "",
        countryCode: addr?.countryCode ?? "",
      }}
    />
  );
}
