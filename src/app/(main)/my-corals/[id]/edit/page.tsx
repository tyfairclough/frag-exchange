import Link from "next/link";
import { notFound } from "next/navigation";
import { CoralProfileStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CoralInventoryForm } from "@/components/coral-inventory-form";
import { updateCoralAction } from "@/app/(main)/my-corals/actions";
import { coralColourToFormValue, coralTypeToFormValue } from "@/lib/coral-options";

type Props = { params: Promise<{ id: string }> };

export default async function EditCoralPage({
  params,
  searchParams,
}: Props & {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const coral = await getPrisma().coral.findFirst({
    where: { id, userId: user.id },
  });

  if (!coral) {
    notFound();
  }

  const boundUpdate = updateCoralAction.bind(null, coral.id);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/my-corals" className="link link-hover text-base-content/70">
          My corals
        </Link>
        <span className="text-base-content/40">/</span>
        <span className="font-medium text-base-content">Edit</span>
      </div>

      <h1 className="text-xl font-semibold text-base-content">Edit {coral.name}</h1>

      {coral.profileStatus === CoralProfileStatus.TRADED ? (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm">
          This coral has been traded and can no longer be edited.
        </p>
      ) : null}

      {error === "name" ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">Please enter a name.</p>
      ) : null}
      {error === "locked" ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">This coral is locked.</p>
      ) : null}

      {coral.profileStatus === CoralProfileStatus.UNLISTED ? (
        <CoralInventoryForm
          saveAction={boundUpdate}
          defaults={{
            name: coral.name,
            description: coral.description,
            imageUrl: coral.imageUrl ?? "",
            listingMode: coral.listingMode,
            freeToGoodHome: coral.freeToGoodHome,
            coralType: coralTypeToFormValue(coral.coralType),
            colour: coralColourToFormValue(coral.colour),
          }}
        />
      ) : null}
    </div>
  );
}
