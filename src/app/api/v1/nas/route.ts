import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseNasBody } from "@/lib/nas-dto";
import { onlineUsersByNas } from "@/server/nas-online";
import { mergeNasPublic, nasPortsIndex, radiusIncomingPort } from "@/server/nas-radius-view";
import { getRadiusPublicIp } from "@/server/radius-engine";
import { syncNasByRecord } from "@/server/radius-hooks";

export const runtime = "nodejs";

export async function GET() {
  const rows = await prisma.nas.findMany({ orderBy: { name: "asc" } });
  const [index, online, incoming, suggestedRadiusIp] = await Promise.all([
    nasPortsIndex(),
    onlineUsersByNas(rows),
    radiusIncomingPort(),
    getRadiusPublicIp(),
  ]);
  return NextResponse.json({
    rows: rows.map((row) =>
      mergeNasPublic(row, index, { userOnline: online.get(row.id) ?? 0 }),
    ),
    meta: {
      radiusIncomingPort: incoming,
      suggestedRadiusIp,
      pingIntervalMs: Number(process.env.NAS_PING_INTERVAL_MS ?? 5 * 60 * 1000),
      tableRefreshMs: 60_000,
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

  let radius: unknown = undefined;
  try {
    radius = await syncNasByRecord(row);
  } catch (error) {
    radius = {
      skipped: false,
      provisionError: error instanceof Error ? error.message : String(error),
    };
  }

  const index = await nasPortsIndex();
  return NextResponse.json(
    { row: mergeNasPublic(row, index), radius },
    { status: 201 },
  );
}
