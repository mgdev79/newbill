import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

function mapRow(row: {
  id: string;
  at: Date;
  reseller: string;
  amount: number;
  status: string;
}) {
  return {
    id: row.id,
    at: row.at.toISOString(),
    reseller: row.reseller,
    amount: row.amount,
    status: row.status,
  };
}

export async function GET() {
  const prisma = await getDb();
  const rows = await prisma.financeTopup.findMany({ orderBy: { at: "desc" } });
  return NextResponse.json({ rows: rows.map(mapRow) });
}

export async function POST(request: Request) {
  const prisma = await getDb();
  const body = (await request.json()) as {
    at?: string;
    reseller?: string;
    amount?: number;
    status?: string;
  };
  if (!body.reseller?.trim()) {
    return NextResponse.json({ error: "Reseller wajib." }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Jumlah wajib lebih dari 0." }, { status: 400 });
  }
  const row = await prisma.financeTopup.create({
    data: {
      at: body.at ? new Date(body.at) : new Date(),
      reseller: body.reseller.trim(),
      amount: Math.round(amount),
      status: body.status === "pending" ? "pending" : "paid",
    },
  });
  return NextResponse.json({ row: mapRow(row) }, { status: 201 });
}
