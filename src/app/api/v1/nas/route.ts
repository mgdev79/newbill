import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseNasBody, toPublicNas } from "@/lib/nas-dto";

export const runtime = "nodejs";

export async function GET() {
  const rows = await prisma.nas.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({
    rows: rows.map(toPublicNas),
    meta: {
      radiusAuthPort: Number(process.env.RADIUS_AUTH_PORT ?? 1812),
      radiusAcctPort: Number(process.env.RADIUS_ACCT_PORT ?? 1813),
      radiusIncomingPort: Number(process.env.RADIUS_INCOMING_PORT ?? 3799),
      suggestedRadiusIp: process.env.RADIUS_PUBLIC_IP ?? "",
    },
  });
}

export async function POST(request: Request) {
  const body = parseNasBody(await request.json());
  if (!body.name || !body.ip) {
    return NextResponse.json({ error: "Nama dan IP router wajib diisi." }, { status: 400 });
  }
  if (!body.radiusSecret) {
    return NextResponse.json({ error: "Radius secret wajib diisi." }, { status: 400 });
  }

  const existing = await prisma.nas.findUnique({ where: { name: body.name } });
  if (existing) {
    return NextResponse.json({ error: "Nama router sudah dipakai." }, { status: 409 });
  }

  const row = await prisma.nas.create({
    data: {
      name: body.name,
      ip: body.ip,
      apiPort: body.apiPort && Number.isFinite(body.apiPort) ? body.apiPort : 8728,
      useSsl: body.useSsl ?? false,
      timeoutSec: body.timeoutSec && Number.isFinite(body.timeoutSec) ? body.timeoutSec : 5,
      apiUser: body.apiUser || "newbill",
      apiPassword: body.apiPassword ?? "",
      timezone: body.timezone || "Asia/Jakarta",
      enabled: body.enabled ?? true,
      description: body.description ?? "",
      radiusSecret: body.radiusSecret,
      latitude: body.latitude ?? "",
      longitude: body.longitude ?? "",
      coverageM: body.coverageM && Number.isFinite(body.coverageM) ? body.coverageM : 0,
      hotspotUrl: body.hotspotUrl ?? "",
      isolirUrl: body.isolirUrl ?? "",
      enablePpp: body.enablePpp ?? true,
      enableHotspot: body.enableHotspot ?? false,
      healthy: false,
    },
  });

  return NextResponse.json({ row: toPublicNas(row) }, { status: 201 });
}
