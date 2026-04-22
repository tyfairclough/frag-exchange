import Link from "next/link";
import {
  BusinessAccountOwnership,
  ExchangeMembershipRole,
  UserGlobalRole,
  UserPostingRole,
} from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { AdminDeleteUserDialog } from "@/app/(main)/admin/users/admin-delete-user-dialog";
import {
  updateUserBusinessOwnershipAction,
  updateUserGlobalRoleAction,
  updateUserPostingRoleAction,
} from "@/app/(main)/admin/users/actions";
import { MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";
import { requireSuperAdmin } from "@/lib/require-super-admin";

const PAGE_SIZE = 25;

function platformRoleLabel(role: UserGlobalRole) {
  return role === UserGlobalRole.SUPER_ADMIN ? "Super admin" : "Member";
}

function memberTierLabel(role: UserPostingRole | null) {
  if (role === UserPostingRole.LFS) {
    return "LFS";
  }
  if (role === UserPostingRole.ONLINE_RETAILER) {
    return "Online retailer";
  }
  return "None";
}

const userErrors: Record<string, string> = {
  invalid: "That request was not valid.",
  "not-found": "User not found.",
  "last-admin": "You cannot remove the last super admin account.",
  "delete-self": "You cannot delete your own account.",
  "delete-failed": "Could not delete that user. Please try again.",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; error?: string; updated?: string; deleted?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const actor = await requireSuperAdmin();
  const db = getPrisma();
  const [users, total, superAdminCount] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        alias: true,
        globalRole: true,
        postingRole: true,
        businessAccountOwnership: true,
        createdAt: true,
        exchangeMemberships: {
          where: { role: ExchangeMembershipRole.EVENT_MANAGER },
          select: {
            exchange: { select: { id: true, name: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    }),
    db.user.count(),
    db.user.count({ where: { globalRole: UserGlobalRole.SUPER_ADMIN } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const errorMessage = params.error ? userErrors[params.error] ?? "Something went wrong." : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/admin"
          className="inline-flex w-fit items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <span aria-hidden className="mr-1.5">
            ←
          </span>
          Back to dashboard
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
            Users
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {total} user{total === 1 ? "" : "s"} · page {page} of {totalPages}
          </p>
        </div>
      </div>

      {params.updated ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          User updated.
        </div>
      ) : null}

      {params.deleted ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          User deleted.
        </div>
      ) : null}

      {errorMessage ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 normal-case">Email / Alias</th>
              <th className="px-4 py-3 normal-case">Role / Member tier</th>
              <th className="px-4 py-3">Event manager</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-bold text-slate-900">{u.email}</div>
                  {u.alias ? (
                    <div className="mt-0.5 font-normal text-slate-600">{u.alias}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <div className="font-bold text-slate-900">{platformRoleLabel(u.globalRole)}</div>
                  <div className="mt-0.5 font-normal text-slate-600">{memberTierLabel(u.postingRole)}</div>
                  {u.postingRole === UserPostingRole.LFS || u.postingRole === UserPostingRole.ONLINE_RETAILER ? (
                    <div className="mt-1 text-xs text-slate-500">
                      Storefront:{" "}
                      {u.businessAccountOwnership === BusinessAccountOwnership.UNCLAIMED ? "Unclaimed" : "Claimed"}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {u.exchangeMemberships.length === 0 ? (
                    "—"
                  ) : (
                    <ul className="max-w-[14rem] list-inside list-disc space-y-0.5 text-slate-700">
                      {u.exchangeMemberships.map((m) => (
                        <li key={m.exchange.id}>
                          <Link
                            href={`/exchanges/${m.exchange.id}`}
                            className="font-medium hover:underline"
                            style={{ color: MARKETING_LINK_BLUE }}
                          >
                            {m.exchange.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                  {u.createdAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {u.globalRole === UserGlobalRole.SUPER_ADMIN ? (
                        <form action={updateUserGlobalRoleAction} className="inline">
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="globalRole" value={UserGlobalRole.MEMBER} />
                          <button
                            type="submit"
                            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Make member
                          </button>
                        </form>
                      ) : (
                        <form action={updateUserGlobalRoleAction} className="inline">
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="globalRole" value={UserGlobalRole.SUPER_ADMIN} />
                          <button
                            type="submit"
                            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Make super admin
                          </button>
                        </form>
                      )}
                    </div>
                    <form
                      action={updateUserPostingRoleAction}
                      className="flex max-w-full flex-wrap items-center justify-end gap-2"
                    >
                      <input type="hidden" name="userId" value={u.id} />
                      <label className="sr-only" htmlFor={`posting-role-${u.id}`}>
                        Posting tier
                      </label>
                      <select
                        id={`posting-role-${u.id}`}
                        name="postingRole"
                        defaultValue={u.postingRole ?? ""}
                        className="max-w-[12rem] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                      >
                        <option value="">None</option>
                        <option value={UserPostingRole.LFS}>LFS</option>
                        <option value={UserPostingRole.ONLINE_RETAILER}>Online retailer</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Save tier
                      </button>
                    </form>
                    {(u.postingRole === UserPostingRole.LFS ||
                      u.postingRole === UserPostingRole.ONLINE_RETAILER) &&
                    u.businessAccountOwnership === BusinessAccountOwnership.UNCLAIMED ? (
                      <form action={updateUserBusinessOwnershipAction} className="inline">
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="businessAccountOwnership" value={BusinessAccountOwnership.CLAIMED} />
                        <button
                          type="submit"
                          className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100"
                        >
                          Mark business claimed
                        </button>
                      </form>
                    ) : null}
                    {u.id === actor.id ? null : (
                      <AdminDeleteUserDialog
                        userId={u.id}
                        email={u.email}
                        disabled={
                          u.globalRole === UserGlobalRole.SUPER_ADMIN && superAdminCount <= 1
                        }
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <nav className="flex flex-wrap items-center justify-center gap-2 text-sm" aria-label="Pagination">
          {page > 1 ? (
            <Link
              href={`/admin/users?page=${page - 1}`}
              className="rounded-full border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50"
              style={{ color: MARKETING_LINK_BLUE }}
            >
              Previous
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={`/admin/users?page=${page + 1}`}
              className="rounded-full border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50"
              style={{ color: MARKETING_LINK_BLUE }}
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
