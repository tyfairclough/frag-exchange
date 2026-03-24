import { NextResponse } from "next/server";
import { ExchangeVisibility } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/super-admin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const exchange = await getPrisma().exchange.findUnique({
    where: { id },
    select: { id: true, name: true, visibility: true },
  });

  if (!exchange) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  const canSee =
    exchange.visibility === ExchangeVisibility.PUBLIC ||
    isSuperAdmin(user) ||
    !!(await getPrisma().exchangeMembership.findFirst({
      where: { exchangeId: exchange.id, userId: user.id },
      select: { id: true },
    }));

  if (!canSee) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({ title: exchange.name });
}
