import { ContactPreference } from "@/generated/prisma/client";
import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
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
        {superUser ? (
          <Link href="/exchanges/new" className="btn btn-primary min-h-11 rounded-xl">
            New exchange
          </Link>
        ) : null}
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

          <div className="mt-3 space-y-1 text-base-content/75">
            <p>
              Terms of Service:{" "}
              {user.tosAcceptedAt
                ? `Agreed (${user.tosVersion ?? user.tosAcceptedAt.toISOString().slice(0, 10)})`
                : "No"}
            </p>
            <p>
              Privacy notice:{" "}
              {user.privacyAcceptedAt
                ? `Agreed (${user.privacyVersion ?? user.privacyAcceptedAt.toISOString().slice(0, 10)})`
                : "No"}
            </p>
            {superUser ? <p>Operator access: Yes</p> : null}
            <p>Contact preference: {contactPreferenceLabel[user.contactPreference]}</p>
            <p>Address: {user.address ? "Yes" : "No"}</p>
          </div>

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
