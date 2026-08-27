import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { syncCustomerById } from "@/server/radius-hooks";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Tagihan tidak ditemukan." }, { status: 404 });
  }
  const body = (await request.json()) as { status?: string; method?: string };
  const status =
    body.status === "paid" || body.status === "void" || body.status === "unpaid"
      ? body.status
      : existing.status;
  const row = await prisma.invoice.update({
    where: { id },
    data: {
      status,
      ...(typeof body.method === "string" ? { method: body.method } : {}),
      paidAt:
        status === "paid"
          ? existing.paidAt ?? new Date()
          : status === "unpaid" || status === "void"
            ? null
            : existing.paidAt,
    },
    include: { customer: true },
  });
  if (status === "paid" && row.customer.status === "isolated") {
    await prisma.customer.update({
      where: { id: row.customerId },
      data: { status: "active", trxStatus: "paid", renewedAt: new Date() },
    });
    await syncCustomerById(row.customerId);
  }
  return NextResponse.json({
    row: {
      id: row.id,
      number: row.number,
      status: row.status,
      method: row.method,
    },
  });
}
