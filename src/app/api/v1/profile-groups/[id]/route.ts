import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resyncUsersOnGroup } from "@/server/radius-hooks";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const existing = await prisma.profileGroup.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Grup tidak ditemukan." }, { status: 404 });
  }
  const body = (await request.json()) as Record<string, string | undefined>;
  try {
    const row = await prisma.profileGroup.update({
      where: { id },
      data: {
        ...(typeof body.name === "string" && body.name.trim() ? { name: body.name.trim() } : {}),
        ...(body.type === "ppp" || body.type === "hotspot" ? { type: body.type } : {}),
        ...(typeof body.nasId === "string" ? { nasId: body.nasId } : {}),
        ...(typeof body.pool === "string" ? { pool: body.pool.trim() } : {}),
        ...(typeof body.owner === "string" ? { owner: body.owner.trim() } : {}),
      },
      include: { nas: { select: { name: true } } },
    });
    await resyncUsersOnGroup(id);
    return NextResponse.json({
      row: {
        id: row.id,
        name: row.name,
        type: row.type,
        pool: row.pool,
        owner: row.owner,
        nasId: row.nasId,
        nas: row.nas.name,
      },
    });
  } catch {
    return NextResponse.json({ error: "Nama grup bentrok." }, { status: 409 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const used = await prisma.plan.count({ where: { groupId: id } });
  if (used > 0) {
    return NextResponse.json(
      { error: "Grup masih dipakai paket. Ubah paket dulu." },
      { status: 409 },
    );
  }
  await prisma.profileGroup.delete({ where: { id } }).catch(() => null);
  return new NextResponse(null, { status: 204 });
}
