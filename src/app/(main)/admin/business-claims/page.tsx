import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { MARKETING_LINK_BLUE, MARKETING_NAVY } from "@/components/marketing/marketing-chrome";
import { BackLink } from "@/components/back-link";

export default async function AdminBusinessClaimsPage() {
  const db = getPrisma();
  const claims = await db.businessClaim.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      user: { select: { id: true, email: true, alias: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink
          href="/admin"
          variant="text"
          className="w-fit rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 no-underline transition hover:bg-slate-50"
        >
          Back to dashboard
        </BackLink>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: MARKETING_NAVY }}>
            Business claims
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Requests from commercial accounts to take over their REEFxCHANGE storefront.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 normal-case">Full name</th>
              <th className="px-4 py-3 normal-case">Account claimed</th>
              <th className="px-4 py-3 normal-case">Business email</th>
              <th className="px-4 py-3 normal-case">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {claims.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-600">
                  No claims yet.
                </td>
              </tr>
            ) : (
              claims.map((c) => {
                const accountLabel = c.user.alias?.trim() || c.user.email;
                return (
                  <tr key={c.id} className="align-top">
                    <td className="px-4 py-3 font-medium text-slate-900">{c.fullName}</td>
                    <td className="px-4 py-3 text-slate-700">{accountLabel}</td>
                    <td className="px-4 py-3 text-slate-700">{c.businessEmail}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {c.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-slate-600">
        After you verify the business, mark the account as claimed from{" "}
        <Link href="/admin/users" className="font-semibold hover:underline" style={{ color: MARKETING_LINK_BLUE }}>
          All users
        </Link>
        .
      </p>
    </div>
  );
}
