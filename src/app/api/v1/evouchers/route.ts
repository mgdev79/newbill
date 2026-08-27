import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const prisma = await getDb();
  const rows = await prisma.evoucherOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({
    rows: rows.map((row) => ({
      id: row.id,
      source: row.source,
      customer: row.customer,
      phone: row.phone,
      email: row.email,
      planName: row.planName,
      planId: row.planId,
      qty: row.qty,
      amount: row.amount,
      hotspotDomain: row.hotspotDomain,
      paymentChannel: row.paymentChannel,
      status: row.status,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const prisma = await getDb();
  const body = (await request.json()) as {
    source?: string;
    customer?: string;
    phone?: string;
    planId?: string;
    qty?: number;
    note?: string;
    status?: string;
  };

  if (!body.customer?.trim()) {
    return NextResponse.json({ error: "Nama/sumber pelanggan wajib." }, { status: 400 });
  }

  const qty = Math.min(Math.max(Number(body.qty) || 1, 1), 100);
  let planName = "Paket e-Voucher";
  let planId = "";
  let amount = 0;

  if (body.planId) {
    const plan = await prisma.plan.findUnique({ where: { id: body.planId } });
    if (!plan) {
      return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });
    }
    planName = plan.name;
    planId = plan.id;
    amount = plan.priceSell * qty;
  }

  const row = await prisma.evoucherOrder.create({
    data: {
      source: body.source?.trim() || "portal",
      customer: body.customer.trim(),
      phone: body.phone?.trim() ?? "",
      planName,
      planId,
      qty,
      amount,
      status: body.status === "paid" ? "paid" : "pending",
      note: body.note?.trim() ?? "",
    },
  });

  return NextResponse.json(
    {
      row: {
        id: row.id,
        source: row.source,
        customer: row.customer,
        phone: row.phone,
        planName: row.planName,
        planId: row.planId,
        qty: row.qty,
        amount: row.amount,
        status: row.status,
        note: row.note,
        createdAt: row.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
