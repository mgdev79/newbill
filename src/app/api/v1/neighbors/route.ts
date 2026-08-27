import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

export const GET = withApiErrorHandling(async function GET() {
  const prisma = await getDb();
  const rows = await prisma.neighbor.findMany({ orderBy: { identity: "asc" } });
  return NextResponse.json({ rows });
});

export const POST = withApiErrorHandling(async function POST(request: Request) {
  const prisma = await getDb();
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
});
