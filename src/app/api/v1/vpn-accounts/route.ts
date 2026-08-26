import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicVpnAccount } from "@/lib/saas";
import { randomSecret } from "@/lib/nas-script";

export const runtime = "nodejs";

export async function GET() {
  const rows = await prisma.vpnAccount.findMany({
    include: { server: true },
    orderBy: { label: "asc" },
  });
  return NextResponse.json({ rows: rows.map(publicVpnAccount) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    label?: string;
    username?: string;
    password?: string;
    serverHost?: string;
    type?: string;
    innerRadiusIp?: string;
    tenantId?: string;
    serverId?: string;
  };
  if (!body.label || !body.username) {
    return NextResponse.json({ error: "Label dan username wajib." }, { status: 400 });
  }

  let serverHost = body.serverHost?.trim() || "";
  let inner = body.innerRadiusIp?.trim() || "";
  let serverId = body.serverId || null;

  if (body.serverId) {
    const server = await prisma.vpnServer.findUnique({ where: { id: body.serverId } });
    if (server) {
      serverHost = server.host;
      if (!inner) inner = server.innerRadiusIp;
      serverId = server.id;
    }
  }

  if (!serverHost) {
    return NextResponse.json({ error: "Server host wajib." }, { status: 400 });
  }

  const row = await prisma.vpnAccount.create({
    data: {
      label: body.label.trim(),
      username: body.username.trim(),
      password: body.password || randomSecret(12),
      serverHost,
      type: body.type || "l2tp",
      innerRadiusIp: inner,
      tenantId: body.tenantId || null,
      serverId,
    },
    include: { server: true },
  });
  return NextResponse.json({ row: publicVpnAccount(row) }, { status: 201 });
}
