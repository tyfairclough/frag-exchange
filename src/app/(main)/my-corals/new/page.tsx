import Link from "next/link";
import { AddCoralWizard } from "@/components/add-coral-wizard";

export default async function NewCoralPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/my-corals" className="link link-hover text-base-content/70">
          My corals
        </Link>
        <span className="text-base-content/40">/</span>
        <span className="font-medium text-base-content">New</span>
      </div>

      <h1 className="text-xl font-semibold text-base-content">Add coral</h1>

      {error === "name" ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">Please enter a name.</p>
      ) : null}
      {error === "image-too-large" ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          Photo is too large (max 6 MB). Choose a smaller image.
        </p>
      ) : null}
      {error === "image-type" ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          Use a JPEG, PNG, or WebP photo.
        </p>
      ) : null}

      <AddCoralWizard />
    </div>
  );
}
