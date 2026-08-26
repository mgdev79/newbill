import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function mapRow(row: {
  id: string;
  name: string;
  minUp: string;
  maxUp: string;
  minDown: string;
  maxDown: string;
  owner: string;
}) {
  return row;
}

export async function GET() {
  const rows = await prisma.bandwidth.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ rows: rows.map(mapRow) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    minUp?: string;
    maxUp?: string;
    minDown?: string;
    maxDown?: string;
    owner?: string;
  };
  if (!body.name?.trim() || !body.maxUp?.trim() || !body.maxDown?.trim()) {
    return NextResponse.json({ error: "Nama, max up, dan max down wajib." }, { status: 400 });
  }
  try {
    const row = await prisma.bandwidth.create({
      data: {
        name: body.name.trim(),
        minUp: body.minUp?.trim() || "1M",
        maxUp: body.maxUp.trim(),
        minDown: body.minDown?.trim() || "1M",
        maxDown: body.maxDown.trim(),
        owner: body.owner?.trim() || "admin",
      },
    });
    return NextResponse.json({ row: mapRow(row) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Nama bandwidth sudah dipakai." }, { status: 409 });
  }
}
