import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canUseBulkItemFetch } from "@/lib/posting-role";
import { BackLink } from "@/components/back-link";
import { FetchItemsConfigForm } from "@/components/fetch-items-config-form";

export default async function FetchItemsPage() {
  const user = await requireUser();
  if (!canUseBulkItemFetch(user)) {
    redirect("/my-items");
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <BackLink href="/my-items">Back to My items</BackLink>
      <div>
        <h1 className="text-xl font-semibold text-base-content">Bulk add items</h1>
        <p className="mt-1 text-sm text-base-content/70">
          Import fish and coral listings in bulk from your website. You&apos;ll review every parsed item before anything is
          added.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/my-items/bulk-import-sources" className="link link-primary">
            Manage multiple catalog URLs and weekly refresh
          </Link>
        </p>
      </div>
      <section className="card border border-base-content/10 bg-base-200/45 shadow-sm">
        <div className="card-body p-5">
          <FetchItemsConfigForm />
        </div>
      </section>
      <p className="text-xs text-base-content/60">
        Tip: keep imports focused to one catalog area at a time for better parsing quality and faster completion.
      </p>
    </div>
  );
}
