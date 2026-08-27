import { NextResponse } from "next/server";
import { platformPrisma as prisma } from "@/lib/platform-db";
import { publicVpnServer } from "@/lib/saas";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    name?: string;
    host?: string;
    region?: string;
    online?: boolean;
    innerRadiusIp?: string;
    note?: string;
    apiPort?: number;
    useSsl?: boolean;
    timeoutSec?: number;
    apiUser?: string;
    apiPassword?: string;
  };

  const existing = await prisma.vpnServer.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Server tidak ditemukan." }, { status: 404 });
  }

  try {
    const row = await prisma.vpnServer.update({
      where: { id },
      data: {
        ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
        ...(typeof body.host === "string" ? { host: body.host.trim() } : {}),
        ...(typeof body.region === "string" ? { region: body.region.trim() } : {}),
        ...(typeof body.online === "boolean" ? { online: body.online } : {}),
        ...(typeof body.innerRadiusIp === "string"
          ? { innerRadiusIp: body.innerRadiusIp.trim() }
          : {}),
        ...(typeof body.note === "string" ? { note: body.note.trim() } : {}),
        ...(typeof body.apiPort === "number" && Number.isFinite(body.apiPort)
          ? { apiPort: body.apiPort }
          : {}),
        ...(typeof body.useSsl === "boolean" ? { useSsl: body.useSsl } : {}),
        ...(typeof body.timeoutSec === "number" && Number.isFinite(body.timeoutSec)
          ? { timeoutSec: body.timeoutSec }
          : {}),
        ...(typeof body.apiUser === "string" ? { apiUser: body.apiUser.trim() } : {}),
        ...(typeof body.apiPassword === "string" && body.apiPassword.length > 0
          ? { apiPassword: body.apiPassword }
          : {}),
      },
      include: { _count: { select: { accounts: true } } },
    });
    return NextResponse.json({
      row: publicVpnServer(row, row._count.accounts),
    });
  } catch {
    return NextResponse.json({ error: "Nama atau host sudah dipakai." }, { status: 409 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const count = await prisma.vpnAccount.count({ where: { serverId: id } });
  if (count > 0) {
    return NextResponse.json(
      { error: "Server masih punya akun VPN. Pindahkan/hapus akun dulu." },
      { status: 409 },
    );
  }
  await prisma.vpnServer.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
