import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

export const PATCH = withApiErrorHandling(async function PATCH(
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
});

export const DELETE = withApiErrorHandling(async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  await prisma.financeTopup.delete({ where: { id } }).catch(() => null);
  return new NextResponse(null, { status: 204 });
});
