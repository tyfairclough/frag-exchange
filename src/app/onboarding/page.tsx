import Link from "next/link";
import { ContactPreference, OnboardingPath } from "@/generated/prisma/enums";
import { completeOnboardingAction } from "@/app/onboarding/actions";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";

const avatarChoices = ["🐠", "🪸", "🐙", "🦀", "🐡", "🐟", "🦐", "🪼"] as const;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  if (user.onboardingCompletedAt) {
    redirect("/");
  }

  const params = await searchParams;
  const path = user.onboardingPath ?? OnboardingPath.EVENT_ONLY;
  const addr = user.address;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <section className="card border border-base-content/10 bg-base-100 shadow-sm">
        <div className="card-body gap-4 p-5">
          <h1 className="text-xl font-semibold tracking-tight">Welcome to Frag Exchange</h1>
          <p className="text-sm text-base-content/75">
            Set your public alias and avatar, choose how we may contact you, and confirm legal notices. Postal details
            stay off public discovery; they are used only for agreed postal trades (later chunks).
          </p>

          {params.error === "tos" ? (
            <div role="alert" className="alert alert-error text-sm">
              You need to accept the Terms of Service to continue.
            </div>
          ) : null}
          {params.error === "privacy" ? (
            <div role="alert" className="alert alert-error text-sm">
              You need to acknowledge the privacy notice to continue.
            </div>
          ) : null}
          {params.error === "address" ? (
            <div role="alert" className="alert alert-error text-sm">
              Group exchanges require full address fields (line 1, town, postal code, two-letter country).
            </div>
          ) : null}
          {params.error === "address-partial" ? (
            <div role="alert" className="alert alert-error text-sm">
              If you enter an address, complete line 1, town, postal code, and a two-letter country code (or clear all
              fields for event-only).
            </div>
          ) : null}

          <form action={completeOnboardingAction} className="space-y-4">
            <label className="form-control gap-1">
              <span className="label-text text-sm font-medium">Alias (public display name)</span>
              <input
                name="alias"
                type="text"
                maxLength={80}
                defaultValue={user.alias ?? ""}
                placeholder="ReefRookie92"
                className="input input-bordered"
              />
            </label>

            <fieldset className="fieldset gap-2">
              <legend className="fieldset-legend text-sm">Fishy avatar</legend>
              <div className="grid grid-cols-4 gap-2">
                {avatarChoices.map((emoji) => (
                  <label key={emoji} className="btn btn-outline gap-2 text-lg">
                    <input
                      type="radio"
                      className="sr-only"
                      name="avatarEmoji"
                      value={emoji}
                      defaultChecked={emoji === (user.avatarEmoji ?? "🐠")}
                    />
                    <span>{emoji}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="fieldset gap-2">
              <legend className="fieldset-legend text-sm">Exchange path</legend>
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="radio"
                  name="onboardingPath"
                  value={OnboardingPath.EVENT_ONLY}
                  defaultChecked={path !== OnboardingPath.GROUP_AND_EVENT}
                  className="radio radio-sm"
                />
                <span className="label-text">Event-only swaps (address optional now)</span>
              </label>
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="radio"
                  name="onboardingPath"
                  value={OnboardingPath.GROUP_AND_EVENT}
                  defaultChecked={path === OnboardingPath.GROUP_AND_EVENT}
                  className="radio radio-sm"
                />
                <span className="label-text">Group + event swaps (address required)</span>
              </label>
            </fieldset>

            <div className="rounded-xl border border-base-content/10 bg-base-200/40 p-3">
              <p className="mb-2 text-sm font-medium">Address (never shown on browse; postal flow after trade confirm)</p>
              <div className="grid grid-cols-1 gap-2">
                <input
                  name="line1"
                  className="input input-bordered w-full"
                  placeholder="Address line 1"
                  defaultValue={addr?.line1 ?? ""}
                />
                <input
                  name="line2"
                  className="input input-bordered w-full"
                  placeholder="Address line 2 (optional)"
                  defaultValue={addr?.line2 ?? ""}
                />
                <input
                  name="town"
                  className="input input-bordered w-full"
                  placeholder="Town / city"
                  defaultValue={addr?.town ?? ""}
                />
                <input
                  name="region"
                  className="input input-bordered w-full"
                  placeholder="County / region (optional)"
                  defaultValue={addr?.region ?? ""}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    name="postalCode"
                    className="input input-bordered w-full"
                    placeholder="Postal code"
                    defaultValue={addr?.postalCode ?? ""}
                  />
                  <input
                    name="countryCode"
                    maxLength={2}
                    className="input input-bordered w-full uppercase"
                    placeholder="GB"
                    defaultValue={addr?.countryCode ?? ""}
                  />
                </div>
              </div>
            </div>

            <fieldset className="fieldset gap-2">
              <legend className="fieldset-legend text-sm">Contact preference</legend>
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="radio"
                  name="contactPreference"
                  value="EMAIL"
                  defaultChecked={user.contactPreference !== ContactPreference.SMS}
                  className="radio radio-sm"
                />
                <span className="label-text">Email (active)</span>
              </label>
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="radio"
                  name="contactPreference"
                  value="SMS"
                  defaultChecked={user.contactPreference === ContactPreference.SMS}
                  className="radio radio-sm"
                />
                <span className="label-text">SMS (placeholder — provider TBD)</span>
              </label>
            </fieldset>

            <label className="label cursor-pointer items-start gap-3">
              <input type="checkbox" name="tosAccepted" className="checkbox checkbox-sm mt-0.5" />
              <span className="label-text text-sm leading-snug">
                I accept the{" "}
                <Link href="/legal/terms" className="link link-primary" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </Link>{" "}
                (version 2026-03-20). A timestamp is stored on my account.
              </span>
            </label>

            <label className="label cursor-pointer items-start gap-3">
              <input type="checkbox" name="privacyAccepted" className="checkbox checkbox-sm mt-0.5" />
              <span className="label-text text-sm leading-snug">
                I have read the{" "}
                <Link href="/legal/privacy" className="link link-primary" target="_blank" rel="noopener noreferrer">
                  privacy notice
                </Link>{" "}
                and consent to processing described there (timestamp stored, version 2026-03-20).
              </span>
            </label>

            <button type="submit" className="btn btn-primary w-full">
              Complete onboarding
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
