import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resyncUsersOnBandwidth } from "@/server/radius-hooks";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const existing = await prisma.bandwidth.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Bandwidth tidak ditemukan." }, { status: 404 });
  }
  const body = (await request.json()) as Record<string, string | undefined>;
  try {
    const row = await prisma.bandwidth.update({
      where: { id },
      data: {
        ...(typeof body.name === "string" && body.name.trim() ? { name: body.name.trim() } : {}),
        ...(typeof body.minUp === "string" ? { minUp: body.minUp.trim() } : {}),
        ...(typeof body.maxUp === "string" ? { maxUp: body.maxUp.trim() } : {}),
        ...(typeof body.minDown === "string" ? { minDown: body.minDown.trim() } : {}),
        ...(typeof body.maxDown === "string" ? { maxDown: body.maxDown.trim() } : {}),
        ...(typeof body.owner === "string" ? { owner: body.owner.trim() } : {}),
      },
    });
    await resyncUsersOnBandwidth(id);
    return NextResponse.json({ row });
  } catch {
    return NextResponse.json({ error: "Nama bandwidth bentrok." }, { status: 409 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const used = await prisma.plan.count({ where: { bandwidthId: id } });
  if (used > 0) {
    return NextResponse.json(
      { error: "Bandwidth masih dipakai paket. Ubah paket dulu." },
      { status: 409 },
    );
  }
  await prisma.bandwidth.delete({ where: { id } }).catch(() => null);
  return new NextResponse(null, { status: 204 });
}
