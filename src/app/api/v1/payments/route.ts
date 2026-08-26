import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { duitkuInquiry } from "@/server/duitku";

export const runtime = "nodejs";

function mapRow(row: {
  id: string;
  ref: string;
  customer: string;
  amount: number;
  channel: string;
  status: string;
  provider: string;
  note: string;
  at: Date;
}) {
  return {
    id: row.id,
    ref: row.ref,
    customer: row.customer,
    amount: row.amount,
    channel: row.channel,
    status: row.status,
    provider: row.provider,
    note: row.note,
    at: row.at.toISOString(),
  };
}

export async function GET(request: Request) {
  const provider = new URL(request.url).searchParams.get("provider");
  const rows = await prisma.paymentTxn.findMany({
    where: provider ? { provider } : undefined,
    orderBy: { at: "desc" },
    take: 500,
  });
  return NextResponse.json({ rows: rows.map(mapRow) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    ref?: string;
    customer?: string;
    amount?: number;
    channel?: string;
    status?: string;
    provider?: string;
    note?: string;
    at?: string;
  };
  const amount = Number(body.amount);
  if (!body.ref?.trim()) {
    return NextResponse.json({ error: "Referensi wajib." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Jumlah wajib lebih dari 0." }, { status: 400 });
  }
  try {
    const row = await prisma.paymentTxn.create({
      data: {
        ref: body.ref.trim(),
        customer: body.customer?.trim() ?? "",
        amount: Math.round(amount),
        channel: body.channel?.trim() ?? "",
        status: body.status?.trim() || "pending",
        provider: body.provider?.trim() || "manual",
        note: body.note?.trim() ?? "",
        at: body.at ? new Date(body.at) : new Date(),
      },
    });
    let payment: { paymentUrl?: string; reference?: string; vaNumber?: string; error?: string } | undefined;
    if (row.provider === "duitku") {
      const inquiry = await duitkuInquiry({
        merchantOrderId: row.ref,
        paymentAmount: row.amount,
        paymentMethod: row.channel || "SP",
        productDetails: `Pembayaran ${row.ref}`,
        customerVaName: row.customer || row.ref,
      });
      if (inquiry.ok) {
        payment = {
          paymentUrl: inquiry.paymentUrl,
          reference: inquiry.reference,
          vaNumber: inquiry.vaNumber,
        };
        await prisma.paymentTxn.update({
          where: { id: row.id },
          data: { note: [row.note, inquiry.reference].filter(Boolean).join(" · ") },
        });
      } else {
        payment = { error: inquiry.error };
      }
    }
    return NextResponse.json({ row: mapRow(row), payment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Referensi sudah dipakai." }, { status: 409 });
  }
}
