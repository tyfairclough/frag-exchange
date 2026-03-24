import Link from "next/link";
import { CoralListingMode, CoralProfileStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { DeleteCoralButton } from "@/components/delete-coral-button";

function listingModeLabel(mode: CoralListingMode) {
  switch (mode) {
    case CoralListingMode.POST:
      return "Post";
    case CoralListingMode.MEET:
      return "Meet";
    default:
      return "Post or meet";
  }
}

export default async function MyCoralsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : undefined;

  const corals = await getPrisma().coral.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-base-content">My corals</h1>
          <p className="mt-1 text-sm text-base-content/70">
            Profile inventory — attach to exchanges when listings go live. Listings without an image are allowed.
          </p>
        </div>
        <Link href="/my-corals/new" className="btn btn-primary btn-sm min-h-10 shrink-0 rounded-xl">
          Add coral
        </Link>
      </div>

      {error === "not-found" ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">That coral was not found.</p>
      ) : null}
      {error === "locked" ? (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-content">
          Traded corals cannot be edited or deleted here.
        </p>
      ) : null}

      {corals.length === 0 ? (
        <section className="card border border-base-content/10 bg-base-200/45 shadow-sm">
          <div className="card-body p-5 text-sm text-base-content/75">
            <p>No corals yet. Add a name and optional photo URL — use AI suggest to draft description and traits.</p>
            <Link href="/my-corals/new" className="btn btn-primary btn-sm mt-3 min-h-10 w-fit rounded-xl">
              Add your first coral
            </Link>
          </div>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {corals.map((c) => (
            <li key={c.id}>
              <article className="card border border-base-content/10 bg-base-100 shadow-sm">
                <div className="card-body gap-3 p-4">
                  <div className="flex gap-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-base-200 text-2xl text-base-content/40">
                      {c.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- arbitrary hobbyist image URLs
                        <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span aria-hidden>🪸</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-base-content">{c.name}</h2>
                        {c.profileStatus === CoralProfileStatus.TRADED ? (
                          <span className="badge badge-neutral badge-sm">Traded</span>
                        ) : (
                          <span className="badge badge-ghost badge-sm">Unlisted</span>
                        )}
                        {c.freeToGoodHome ? (
                          <span className="badge badge-success badge-sm badge-outline">Free to good home</span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-base-content/70">{c.description || "No description yet."}</p>
                      <p className="mt-2 text-xs text-base-content/60">
                        {listingModeLabel(c.listingMode)}
                        {c.coralType ? ` · ${c.coralType}` : ""}
                        {c.colour ? ` · ${c.colour}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-base-content/10 pt-3">
                    {c.profileStatus === CoralProfileStatus.UNLISTED ? (
                      <>
                        <Link href={`/my-corals/${c.id}/edit`} className="btn btn-outline btn-sm min-h-10 rounded-xl">
                          Edit
                        </Link>
                        <DeleteCoralButton coralId={c.id} />
                      </>
                    ) : (
                      <p className="text-xs text-base-content/60">This coral is locked after a completed trade.</p>
                    )}
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
