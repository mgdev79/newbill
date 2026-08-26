import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const rows = await prisma.neighbor.findMany({ orderBy: { identity: "asc" } });
  return NextResponse.json({ rows });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    identity?: string;
    address?: string;
    mac?: string;
    board?: string;
  };
  if (!body.identity?.trim() || !body.address?.trim()) {
    return NextResponse.json({ error: "Identity dan address wajib." }, { status: 400 });
  }
  const row = await prisma.neighbor.create({
    data: {
      identity: body.identity.trim(),
      address: body.address.trim(),
      mac: body.mac?.trim() ?? "",
      board: body.board?.trim() ?? "",
    },
  });
  return NextResponse.json({ row }, { status: 201 });
}
