import Link from "next/link";
import { UserGlobalRole } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { updateUserGlobalRoleAction } from "@/app/(main)/admin/users/actions";
import { MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";

const PAGE_SIZE = 25;

const userErrors: Record<string, string> = {
  invalid: "That request was not valid.",
  "not-found": "User not found.",
  "last-admin": "You cannot remove the last super admin account.",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; error?: string; updated?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const db = getPrisma();
  const [users, total] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        alias: true,
        globalRole: true,
        createdAt: true,
      },
    }),
    db.user.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const errorMessage = params.error ? userErrors[params.error] ?? "Something went wrong." : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
            Users
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {total} user{total === 1 ? "" : "s"} · page {page} of {totalPages}
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm font-semibold hover:underline"
          style={{ color: MARKETING_LINK_BLUE }}
        >
          Back to dashboard
        </Link>
      </div>

      {params.updated ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          User updated.
        </div>
      ) : null}

      {errorMessage ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Alias</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="align-top">
                <td className="px-4 py-3 font-medium text-slate-900">{u.email}</td>
                <td className="px-4 py-3 text-slate-700">{u.alias ?? "—"}</td>
                <td className="px-4 py-3 text-slate-700">
                  {u.globalRole === UserGlobalRole.SUPER_ADMIN ? "Super admin" : "Member"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                  {u.createdAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-3 text-right">
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
