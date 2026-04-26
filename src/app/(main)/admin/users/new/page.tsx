import { UserGlobalRole, UserPostingRole } from "@/generated/prisma/enums";
import { createUserAction } from "@/app/(main)/admin/users/actions";
import { BackLink } from "@/components/back-link";
import { MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";
import { getPrisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/require-super-admin";

export default async function AdminUsersNewPage() {
  await requireSuperAdmin();
  const db = getPrisma();
  const exchanges = await db.exchange.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, kind: true, visibility: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink
          href="/admin/users"
          variant="text"
          className="w-fit rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 no-underline transition hover:bg-slate-50"
        >
          Back to users
        </BackLink>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
            Add Reefer
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Create a user, assign their role and tier, optionally add exchange memberships, then send an access magic link.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <form id="create-user-form" action={createUserAction} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-slate-700">Email address</span>
            <input
              required
              type="email"
              name="email"
              placeholder="reefer@example.com"
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-slate-700">Username (optional)</span>
            <input
              type="text"
              name="alias"
              maxLength={80}
              placeholder="Auto generated if left blank"
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-slate-700">Role type</span>
            <select name="globalRole" defaultValue={UserGlobalRole.MEMBER} className="rounded-lg border border-slate-300 px-3 py-2">
              <option value={UserGlobalRole.MEMBER}>Member</option>
              <option value={UserGlobalRole.SUPER_ADMIN}>Super admin</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-slate-700">Member tier</span>
            <select name="postingRole" defaultValue="" className="rounded-lg border border-slate-300 px-3 py-2">
              <option value="">None</option>
              <option value={UserPostingRole.LFS}>LFS</option>
              <option value={UserPostingRole.ONLINE_RETAILER}>Online retailer</option>
            </select>
          </label>
          <fieldset className="sm:col-span-2 rounded-xl border border-slate-200 p-3">
            <legend className="px-1 text-sm font-semibold text-slate-700">Assign exchanges</legend>
            {exchanges.length === 0 ? (
              <p className="text-sm text-slate-500">No exchanges available yet.</p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {exchanges.map((exchange) => (
                  <label key={exchange.id} className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <input type="checkbox" name="exchangeIds" value={exchange.id} className="mt-1" />
                    <span>
                      <span className="font-semibold text-slate-800">{exchange.name}</span>
                      <span className="block text-xs text-slate-500">
                        {exchange.kind.toLowerCase()} · {exchange.visibility.toLowerCase()}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              className="rounded-full px-5 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: MARKETING_LINK_BLUE }}
            >
              Add Reefer
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
