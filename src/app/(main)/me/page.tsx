import { ContactPreference } from "@/generated/prisma/client";
import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { MeAddressSection } from "@/app/(main)/me/me-address-section";
import { requireUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";

const contactPreferenceLabel: Record<ContactPreference, string> = {
  [ContactPreference.EMAIL]: "Email",
  [ContactPreference.SMS]: "SMS",
};

export default async function MePage() {
  const user = await requireUser();
  const superUser = isSuperAdmin(user);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-xl font-semibold text-base-content">Me</h1>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/exchanges" className="btn btn-outline min-h-11 rounded-xl">
          Exchanges
        </Link>
        <Link href="/my-corals" className="btn btn-outline min-h-11 rounded-xl">
          My corals
        </Link>
      </div>
      <section className="card border border-base-content/10 bg-base-100 shadow-sm">
        <div className="card-body p-5 text-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-2xl">
              {user.avatarEmoji ?? "🐠"}
            </span>
            <div>
              <p className="text-base font-semibold">{user.alias ?? "No alias yet"}</p>
              <p className="text-base-content/70">{user.email}</p>
            </div>
          </div>

          <dl className="mt-3 border-t border-base-content/10 pt-3 text-sm">
            <div className="flex flex-col gap-0.5 py-2 first:pt-0 sm:flex-row sm:items-start sm:gap-4 sm:py-2.5">
              <dt className="shrink-0 font-medium text-base-content sm:w-40 sm:pt-0.5">
                <Link href="/legal/terms" className="text-blue-700 hover:underline">
                  Terms of Service
                </Link>
              </dt>
              <dd className="min-w-0 text-base-content/80">
                {user.tosAcceptedAt
                  ? `Agreed (${user.tosVersion ?? user.tosAcceptedAt.toISOString().slice(0, 10)})`
                  : "No"}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 border-t border-base-content/10 py-2 sm:flex-row sm:items-start sm:gap-4 sm:py-2.5">
              <dt className="shrink-0 font-medium text-base-content sm:w-40 sm:pt-0.5">
                <Link href="/legal/privacy" className="text-blue-700 hover:underline">
                  Privacy notice
                </Link>
              </dt>
              <dd className="min-w-0 text-base-content/80">
                {user.privacyAcceptedAt
                  ? `Agreed (${user.privacyVersion ?? user.privacyAcceptedAt.toISOString().slice(0, 10)})`
                  : "No"}
              </dd>
            </div>
            {superUser ? (
              <div className="flex flex-col gap-0.5 border-t border-base-content/10 py-2 sm:flex-row sm:items-start sm:gap-4 sm:py-2.5">
                <dt className="shrink-0 font-medium text-base-content sm:w-40 sm:pt-0.5">
                  Admin
                </dt>
                <dd className="min-w-0 text-base-content/80">
                  <span className="font-medium text-slate-800">Super admin</span>
                  {" · "}
                  <Link href="/admin" className="font-medium text-blue-700 hover:underline">
                    Open admin
                  </Link>
                </dd>
              </div>
            ) : null}
            <div className="flex flex-col gap-0.5 border-t border-base-content/10 py-2 sm:flex-row sm:items-start sm:gap-4 sm:py-2.5">
              <dt className="shrink-0 font-medium text-base-content sm:w-40 sm:pt-0.5">
                Contact preference
              </dt>
              <dd className="min-w-0 text-base-content/80">
                {contactPreferenceLabel[user.contactPreference]}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 border-t border-base-content/10 py-2 sm:flex-row sm:items-start sm:gap-4 sm:py-2.5">
              <dt className="shrink-0 font-medium text-base-content sm:w-40 sm:pt-0.5">
                Address
              </dt>
              <dd className="min-w-0">
                <MeAddressSection
                  address={
                    user.address
                      ? {
                          line1: user.address.line1,
                          line2: user.address.line2,
                          town: user.address.town,
                          region: user.address.region,
                          postalCode: user.address.postalCode,
                          countryCode: user.address.countryCode,
                        }
                      : null
                  }
                />
              </dd>
            </div>
          </dl>

          <form action={signOutAction} className="mt-4">
            <button type="submit" className="btn btn-outline btn-sm">
              Sign out
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
