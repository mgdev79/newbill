import { NextResponse } from "next/server";
import { platformPrisma as prisma } from "@/lib/platform-db";
import { publicVpnServer } from "@/lib/saas";

export const runtime = "nodejs";

export async function GET() {
  const rows = await prisma.vpnServer.findMany({
    include: { _count: { select: { accounts: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    rows: rows.map((row) => publicVpnServer(row, row._count.accounts)),
  });
}

export async function POST(request: Request) {
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
  if (!body.name || !body.host) {
    return NextResponse.json({ error: "Nama dan host wajib." }, { status: 400 });
  }
  try {
    const row = await prisma.vpnServer.create({
      data: {
        name: body.name.trim(),
        host: body.host.trim(),
        region: body.region?.trim() || "Indonesia",
        online: body.online ?? true,
        innerRadiusIp: body.innerRadiusIp?.trim() || "",
        note: body.note?.trim() || "",
        apiPort: body.apiPort && Number.isFinite(body.apiPort) ? body.apiPort : 8728,
        useSsl: Boolean(body.useSsl),
        timeoutSec:
          body.timeoutSec && Number.isFinite(body.timeoutSec) ? body.timeoutSec : 5,
        apiUser: body.apiUser?.trim() || "newbill",
        apiPassword: body.apiPassword ?? "",
      },
    });
    return NextResponse.json({ row: publicVpnServer(row, 0) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Nama atau host sudah dipakai." }, { status: 409 });
  }
}
