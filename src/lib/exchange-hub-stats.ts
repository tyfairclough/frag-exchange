import { TradeStatus } from "@/generated/prisma/enums";

export function tradeBucketsFromGroupBy(
  rows: { status: TradeStatus; _count: { _all: number } }[],
): { complete: number; pending: number; cancelled: number } {
  let complete = 0;
  let pending = 0;
  let cancelled = 0;
  for (const row of rows) {
    const n = row._count._all;
    if (row.status === TradeStatus.APPROVED) {
      complete += n;
    } else if (row.status === TradeStatus.OFFER || row.status === TradeStatus.COUNTERED) {
      pending += n;
    } else {
      cancelled += n;
    }
  }
  return { complete, pending, cancelled };
}
