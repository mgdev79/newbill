import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function mapRow(row: {
  id: string;
  at: Date;
  category: string;
  note: string;
  amount: number;
}) {
  return {
    id: row.id,
    at: row.at.toISOString(),
    category: row.category,
    note: row.note,
    amount: row.amount,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const rows = await prisma.financePayout.findMany({
    where:
      from || to
        ? {
            at: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
            },
          }
        : undefined,
    orderBy: { at: "desc" },
  });
  return NextResponse.json({
    rows: rows.map(mapRow),
    total: rows.reduce((sum, row) => sum + row.amount, 0),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    at?: string;
    category?: string;
    note?: string;
    amount?: number;
  };
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Jumlah wajib lebih dari 0." }, { status: 400 });
  }
  const row = await prisma.financePayout.create({
    data: {
      at: body.at ? new Date(body.at) : new Date(),
      category: body.category?.trim() || "operasional",
      note: body.note?.trim() ?? "",
      amount: Math.round(amount),
    },
  });
  return NextResponse.json({ row: mapRow(row) }, { status: 201 });
}
