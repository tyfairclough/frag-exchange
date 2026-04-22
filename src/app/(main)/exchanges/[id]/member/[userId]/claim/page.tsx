import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BusinessAccountOwnership, UserPostingRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { hasRecentBusinessClaim, RECENT_BUSINESS_CLAIM_COOLDOWN_DAYS } from "@/lib/business-claim";
import { getPrisma } from "@/lib/db";
import { canViewExchangeDirectory } from "@/lib/super-admin";
import { submitBusinessClaimAction } from "./actions";

const claimErrors: Record<string, string> = {
  invalid: "Please check your details and try again.",
  forbidden: "You do not have permission to submit a claim here.",
  recent: `You already submitted a claim recently. If you need help, contact REEFX using the details in our privacy notice.`,
};

export default async function ClaimBusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; userId: string }>;
  searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
  const viewer = await requireUser();
  const { id: exchangeId, userId: memberUserId } = await params;
  const sp = await searchParams;

  if (memberUserId !== viewer.id) {
    notFound();
  }

  const exchange = await getPrisma().exchange.findUnique({
    where: { id: exchangeId },
    include: {
      memberships: {
        where: { userId: { in: [viewer.id, memberUserId] } },
      },
    },
  });

  if (!exchange) {
    notFound();
  }

  const viewerMembership = exchange.memberships.find((m) => m.userId === viewer.id) ?? null;
  const ownerMembership = exchange.memberships.find((m) => m.userId === memberUserId) ?? null;

  if (!canViewExchangeDirectory(exchange, viewerMembership, viewer) || !viewerMembership || !ownerMembership) {
    notFound();
  }

  const targetUser = await getPrisma().user.findUnique({
    where: { id: memberUserId },
    select: {
      postingRole: true,
      businessAccountOwnership: true,
    },
  });

  if (!targetUser) {
    notFound();
  }

  const isCommercial =
    targetUser.postingRole === UserPostingRole.LFS ||
    targetUser.postingRole === UserPostingRole.ONLINE_RETAILER;

  if (!isCommercial || targetUser.businessAccountOwnership !== BusinessAccountOwnership.UNCLAIMED) {
    redirect(`/exchanges/${encodeURIComponent(exchangeId)}/member/${encodeURIComponent(memberUserId)}`);
  }

  const recent = await hasRecentBusinessClaim(getPrisma(), memberUserId);
  const submitted = sp.submitted === "1";
  const errorMessage = sp.error ? claimErrors[sp.error] ?? "Something went wrong." : null;

  const memberHref = `/exchanges/${encodeURIComponent(exchangeId)}/member/${encodeURIComponent(memberUserId)}`;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <Link href={memberHref} className="btn btn-ghost btn-sm min-h-10 w-fit rounded-xl">
        Back to your listings
      </Link>

      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-base-content">Claim my business</h1>
        <p className="text-sm text-base-content/70">
          Tell us how to reach you on <span className="font-medium text-base-content">{exchange.name}</span>. All fields
          are required.
        </p>
      </header>

      {submitted ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-medium text-emerald-900">Thank you</p>
          <p className="mt-2">
            REEFX will contact you by phone or via any official channel you have published within the next 48–72 hours.
          </p>
          <p className="mt-3">
            <Link href={memberHref} className="font-semibold text-emerald-900 underline">
              Return to your listings
            </Link>
          </p>
        </div>
      ) : null}

      {errorMessage && !submitted ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      {!submitted && recent ? (
        <p className="text-sm text-base-content/70">
          We already have a claim from this account within the last {RECENT_BUSINESS_CLAIM_COOLDOWN_DAYS} days. REEFX
          will be in touch if we need
          anything further.
        </p>
      ) : null}

      {!submitted && !recent ? (
        <form action={submitBusinessClaimAction} className="flex flex-col gap-4">
          <input type="hidden" name="exchangeId" value={exchangeId} />
          <input type="hidden" name="memberUserId" value={memberUserId} />

          <label className="form-control w-full">
            <span className="label-text mb-1 text-sm font-medium text-base-content">Full name</span>
            <input
              type="text"
              name="fullName"
              required
              autoComplete="name"
              maxLength={160}
              className="input input-bordered w-full rounded-xl"
            />
          </label>

          <label className="form-control w-full">
            <span className="label-text mb-1 text-sm font-medium text-base-content">Business email</span>
            <input
              type="email"
              name="businessEmail"
              required
              autoComplete="email"
              maxLength={255}
              className="input input-bordered w-full rounded-xl"
            />
          </label>

          <button type="submit" className="btn btn-primary min-h-11 rounded-xl">
            Submit
          </button>
        </form>
      ) : null}
    </div>
  );
}
