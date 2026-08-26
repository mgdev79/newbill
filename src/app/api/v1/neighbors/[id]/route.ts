import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const existing = await prisma.neighbor.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Neighbor tidak ditemukan." }, { status: 404 });
  const body = (await request.json()) as Record<string, string | undefined>;
  const row = await prisma.neighbor.update({
    where: { id },
    data: {
      ...(typeof body.identity === "string" ? { identity: body.identity.trim() } : {}),
      ...(typeof body.address === "string" ? { address: body.address.trim() } : {}),
      ...(typeof body.mac === "string" ? { mac: body.mac.trim() } : {}),
      ...(typeof body.board === "string" ? { board: body.board.trim() } : {}),
    },
  });
  return NextResponse.json({ row });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  await prisma.neighbor.delete({ where: { id } }).catch(() => null);
  return new NextResponse(null, { status: 204 });
}
