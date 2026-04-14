import { MeHubNav } from "@/app/(main)/me/me-hub-nav";
import { MeTradeSeekingForm } from "@/app/(main)/me/me-trade-seeking-form";
import { requireUser } from "@/lib/auth";

export default async function MePreferencesPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold text-base-content">Me</h1>
        <p className="mt-0.5 text-sm text-base-content/70">Preferences</p>
      </div>
      <MeHubNav />
      <section className="card border border-base-content/10 bg-base-100 shadow-sm">
        <div className="card-body p-5 text-sm">
          <MeTradeSeekingForm initialNotes={user.tradeSeekingNotes ?? ""} />
        </div>
      </section>
    </div>
  );
}
