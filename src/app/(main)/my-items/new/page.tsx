import { AddItemWizard } from "@/components/add-item-wizard";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NewItemPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent("/my-items/new")}`);
  }
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
      <h1 className="text-xl font-semibold text-base-content">Add item</h1>
      <p className="mt-1 text-sm text-base-content/70">Start with a photo — we&apos;ll suggest the rest.</p>
      <div className="mt-4">
        <AddItemWizard />
      </div>
    </div>
  );
}
