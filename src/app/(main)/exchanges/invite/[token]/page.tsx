import Link from "next/link";
import { notFound } from "next/navigation";
import { acceptInviteFormAction } from "@/app/(main)/exchanges/actions";
import { requireUser } from "@/lib/auth";

const inviteErrors: Record<string, string> = {
  "email-mismatch": "Sign in with the invited email address, then try again.",
};

export default async function ExchangeInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { token } = await params;
  const sp = await searchParams;
  if (!token) {
    notFound();
  }

  const errorMessage = sp.error ? inviteErrors[sp.error] ?? "Something went wrong." : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
      <Link href="/exchanges" className="btn btn-ghost btn-sm min-h-10 w-fit rounded-xl">
        All exchanges
      </Link>

      <div>
        <p className="text-sm font-medium text-primary">Private exchange</p>
        <h1 className="text-xl font-semibold text-base-content">Accept invite</h1>
        <p className="mt-1 text-sm text-base-content/70">
          You will join the exchange as a member. Your account email must match the invite.
        </p>
      </div>

      {errorMessage ? (
        <div role="alert" className="alert alert-warning text-sm">
          {errorMessage}
        </div>
      ) : null}

      <form action={acceptInviteFormAction} className="card border border-base-content/10 bg-base-100 shadow-sm">
        <div className="card-body gap-3 p-5">
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="btn btn-primary min-h-11 rounded-xl">
            Join this exchange
          </button>
        </div>
      </form>
    </div>
  );
}
