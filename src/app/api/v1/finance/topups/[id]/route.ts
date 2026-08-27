import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  const existing = await prisma.financeTopup.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Topup tidak ditemukan." }, { status: 404 });
  const body = (await request.json()) as { status?: string };
  const row = await prisma.financeTopup.update({
    where: { id },
    data: {
      status: body.status === "pending" || body.status === "paid" ? body.status : existing.status,
    },
  });
  return NextResponse.json({
    row: {
      id: row.id,
      at: row.at.toISOString(),
      reseller: row.reseller,
      amount: row.amount,
      status: row.status,
    },
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  await prisma.financeTopup.delete({ where: { id } }).catch(() => null);
  return new NextResponse(null, { status: 204 });
}
