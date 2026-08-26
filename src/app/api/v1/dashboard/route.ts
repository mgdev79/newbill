import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [pppOnline, hotspotOnline, logs, radiusOk] = await Promise.all([
    prisma.radAcct.count({ where: { kind: "ppp", stoppedAt: null } }),
    prisma.radAcct.count({ where: { kind: "hotspot", stoppedAt: null } }),
    prisma.radiusLog.findMany({ orderBy: { at: "desc" }, take: 8 }),
    prisma.nas.count(),
  ]);
  return NextResponse.json({
    kpis: { pppOnline, hotspotOnline, unpaidCount: 24, incomeToday: 0 },
    radius: { ready: radiusOk > 0, secretConfigured: true },
    logs,
  });
}
