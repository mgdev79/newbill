import { NextResponse } from "next/server";
import { makeInvoiceNumber, splitInclusiveTax } from "@/lib/billing";
import { getDb } from "@/lib/db";
import { parseValidityToExpiry } from "@/lib/voucher-code";
import { syncCustomerById } from "@/server/radius-hooks";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

export const POST = withApiErrorHandling(async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  const existing = await prisma.customer.findUnique({
    where: { id },
    include: { plan: true, nas: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Pelanggan tidak ditemukan." }, { status: 404 });
  }

  const now = new Date();
  const base = existing.dueAt.getTime() > now.getTime() ? existing.dueAt : now;
  const dueAt = parseValidityToExpiry(existing.plan.validity || "30 hari", base);
  const vatPct = existing.applyTax ? existing.plan.vatPct || 11 : 0;
  const packageTotal = Math.max(0, existing.plan.priceSell - existing.discount);
  const { subTotal, taxAmount } = splitInclusiveTax(packageTotal, vatPct);
  const amount = packageTotal + existing.deviceFee;

  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        number: makeInvoiceNumber(),
        customerId: existing.id,
        planName: existing.plan.name,
        planNote: "",
        periodLabel: existing.plan.validity || "1 Bulan",
        amount,
        subTotal,
        taxAmount,
        deviceFee: existing.deviceFee,
        dueAt,
        status: "paid",
        method: "Manual",
        payMode: existing.payMode,
        subscriptionType: existing.subscriptionType,
        paidAt: now,
      },
    });
    const row = await tx.customer.update({
      where: { id: existing.id },
      data: {
        dueAt,
        renewedAt: now,
        status: "active",
        trxStatus: "paid",
      },
      include: { plan: true, nas: true },
    });
    return { row, invoice };
  });

  let radius: unknown = undefined;
  try {
    radius = await syncCustomerById(result.row.id);
  } catch (error) {
    radius = {
      radiusSync: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }

  return NextResponse.json({
    row: {
      id: result.row.id,
      dueAt: result.row.dueAt.toISOString(),
      renewedAt: result.row.renewedAt?.toISOString() ?? null,
      status: result.row.status,
    },
    invoice: { id: result.invoice.id, number: result.invoice.number },
    radius,
  });
});
