import { redirect } from "next/navigation";

export default async function ExchangeTradeInitiationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ with?: string; focus?: string; error?: string }>;
}) {
  const { id: exchangeId } = await params;
  const sp = await searchParams;
  const query = new URLSearchParams();
  if (sp.with?.trim()) {
    query.set("with", sp.with.trim());
  }
  if (sp.focus?.trim()) {
    query.set("focus", sp.focus.trim());
  }
  if (sp.error?.trim()) {
    query.set("error", sp.error.trim());
  }
  redirect(`/exchanges/${encodeURIComponent(exchangeId)}/trade/receive${query.size ? `?${query.toString()}` : ""}`);
}
