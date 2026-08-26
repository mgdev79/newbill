import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

async function withUsed<T extends { id: string; name: string }>(rows: T[]) {
  const counts = await prisma.customer.groupBy({
    by: ["odp"],
    where: { odp: { in: rows.map((row) => row.name) } },
    _count: { odp: true },
  });
  const map = new Map(counts.map((row) => [row.odp, row._count.odp]));
  return rows.map((row) => ({ ...row, used: map.get(row.name) ?? 0 }));
}

export async function GET() {
  const rows = await prisma.odp.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ rows: await withUsed(rows) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    area?: string;
    lat?: string;
    lng?: string;
    capacity?: number;
    note?: string;
  };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Nama ODP wajib." }, { status: 400 });
  }
  try {
    const row = await prisma.odp.create({
      data: {
        name: body.name.trim(),
        area: body.area?.trim() ?? "",
        lat: body.lat?.trim() ?? "",
        lng: body.lng?.trim() ?? "",
        capacity: Number(body.capacity) || 16,
        note: body.note?.trim() ?? "",
      },
    });
    return NextResponse.json({ row: { ...row, used: 0 } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Nama ODP sudah dipakai." }, { status: 409 });
  }
}
