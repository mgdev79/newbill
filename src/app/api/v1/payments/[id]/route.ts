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
  const existing = await prisma.paymentTxn.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
  const body = (await request.json()) as { status?: string; note?: string };
  const row = await prisma.paymentTxn.update({
    where: { id },
    data: {
      ...(typeof body.status === "string" ? { status: body.status } : {}),
      ...(typeof body.note === "string" ? { note: body.note } : {}),
    },
  });
  return NextResponse.json({
    row: {
      id: row.id,
      ref: row.ref,
      customer: row.customer,
      amount: row.amount,
      channel: row.channel,
      status: row.status,
      provider: row.provider,
      note: row.note,
      at: row.at.toISOString(),
    },
  });
});

export const DELETE = withApiErrorHandling(async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  await prisma.paymentTxn.delete({ where: { id } }).catch(() => null);
  return new NextResponse(null, { status: 204 });
});
