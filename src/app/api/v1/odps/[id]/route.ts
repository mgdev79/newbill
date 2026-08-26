import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const existing = await prisma.odp.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "ODP tidak ditemukan." }, { status: 404 });
  const body = (await request.json()) as Record<string, string | number | undefined>;
  const row = await prisma.odp.update({
    where: { id },
    data: {
      ...(typeof body.name === "string" && body.name.trim() ? { name: body.name.trim() } : {}),
      ...(typeof body.area === "string" ? { area: body.area } : {}),
      ...(typeof body.lat === "string" ? { lat: body.lat } : {}),
      ...(typeof body.lng === "string" ? { lng: body.lng } : {}),
      ...(typeof body.owner === "string" ? { owner: body.owner.trim() || "admin" } : {}),
      ...(body.capacity !== undefined ? { capacity: Number(body.capacity) || 0 } : {}),
      ...(typeof body.note === "string" ? { note: body.note } : {}),
    },
  });
  return NextResponse.json({ row });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  await prisma.odp.delete({ where: { id } }).catch(() => null);
  return new NextResponse(null, { status: 204 });
}
