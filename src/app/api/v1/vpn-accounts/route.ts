import { NextResponse } from "next/server";
import { getRequestTenant } from "@/lib/db";
import { platformPrisma } from "@/lib/platform-db";
import { publicVpnAccount } from "@/lib/saas";
import { randomSecret } from "@/lib/nas-script";

export const runtime = "nodejs";

export async function GET() {
  const tenant = await getRequestTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant tidak ditemukan." }, { status: 404 });
  }
  const rows = await platformPrisma.vpnAccount.findMany({
    where: { tenantId: tenant.id },
    include: { server: true },
    orderBy: { label: "asc" },
  });
  return NextResponse.json({ rows: rows.map(publicVpnAccount) });
}

export async function POST(request: Request) {
  const tenant = await getRequestTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant tidak ditemukan." }, { status: 404 });
  }
  const body = (await request.json()) as {
    label?: string;
    username?: string;
    password?: string;
    serverHost?: string;
    type?: string;
    innerRadiusIp?: string;
    assignedIp?: string;
    serverId?: string;
  };
  if (!body.label || !body.username) {
    return NextResponse.json({ error: "Label dan username wajib." }, { status: 400 });
  }

  let serverHost = body.serverHost?.trim() || "";
  let inner = body.innerRadiusIp?.trim() || "";
  let serverId = body.serverId || null;

  if (body.serverId) {
    const server = await platformPrisma.vpnServer.findUnique({ where: { id: body.serverId } });
    if (server) {
      serverHost = server.host;
      inner = inner || server.innerRadiusIp;
      serverId = server.id;
    }
  }

  const row = await platformPrisma.vpnAccount.create({
    data: {
      label: body.label.trim(),
      username: body.username.trim(),
      password: body.password?.trim() || randomSecret(12),
      type: body.type?.trim() || "l2tp",
      innerRadiusIp: inner,
      note: body.assignedIp?.trim() ? `IP: ${body.assignedIp.trim()}` : "",
      enabled: true,
      tenantId: tenant.id,
      serverId,
      serverHost,
    },
    include: { server: true },
  });
  return NextResponse.json({ row: publicVpnAccount(row) }, { status: 201 });
}
