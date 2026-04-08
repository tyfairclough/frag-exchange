import { redirect } from "next/navigation";

export default async function LegacyEditCoralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/my-items/${encodeURIComponent(id)}/edit`);
}
