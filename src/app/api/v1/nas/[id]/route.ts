import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseNasBody, toPublicNas } from "@/lib/nas-dto";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const row = await prisma.nas.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Router tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ row: toPublicNas(row) });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const existing = await prisma.nas.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Router tidak ditemukan." }, { status: 404 });

  const body = parseNasBody(await request.json());
  if (body.name && body.name !== existing.name) {
    const clash = await prisma.nas.findUnique({ where: { name: body.name } });
    if (clash) {
      return NextResponse.json({ error: "Nama router sudah dipakai." }, { status: 409 });
    }
  }

  const row = await prisma.nas.update({
    where: { id },
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.ip ? { ip: body.ip } : {}),
      ...(body.apiPort !== undefined && Number.isFinite(body.apiPort)
        ? { apiPort: body.apiPort }
        : {}),
      ...(body.useSsl !== undefined ? { useSsl: body.useSsl } : {}),
      ...(body.timeoutSec !== undefined && Number.isFinite(body.timeoutSec)
        ? { timeoutSec: body.timeoutSec }
        : {}),
      ...(body.apiUser ? { apiUser: body.apiUser } : {}),
      ...(body.apiPassword ? { apiPassword: body.apiPassword } : {}),
      ...(body.timezone ? { timezone: body.timezone } : {}),
      ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.radiusSecret ? { radiusSecret: body.radiusSecret } : {}),
      ...(body.latitude !== undefined ? { latitude: body.latitude } : {}),
      ...(body.longitude !== undefined ? { longitude: body.longitude } : {}),
      ...(body.coverageM !== undefined && Number.isFinite(body.coverageM)
        ? { coverageM: body.coverageM }
        : {}),
      ...(body.hotspotUrl !== undefined ? { hotspotUrl: body.hotspotUrl } : {}),
      ...(body.isolirUrl !== undefined ? { isolirUrl: body.isolirUrl } : {}),
      ...(body.enablePpp !== undefined ? { enablePpp: body.enablePpp } : {}),
      ...(body.enableHotspot !== undefined ? { enableHotspot: body.enableHotspot } : {}),
    },
  });

  return NextResponse.json({ row: toPublicNas(row) });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const groups = await prisma.profileGroup.count({ where: { nasId: id } });
  if (groups > 0) {
    return NextResponse.json(
      { error: "Router masih dipakai grup profil. Hapus grup dulu." },
      { status: 409 },
    );
  }
  await prisma.nas.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
