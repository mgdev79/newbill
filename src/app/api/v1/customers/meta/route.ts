import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

/** Meta form tambah/ubah pelanggan (NAS, paket, ODP dari DB). */
export async function GET(request: Request) {
  const prisma = await getDb();
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") === "hotspot" ? "hotspot" : "ppp";

  const [nasRows, planRows, odpSetting] = await Promise.all([
    prisma.nas.findMany({
      where: { enabled: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        ip: true,
        enablePpp: true,
        enableHotspot: true,
      },
    }),
    prisma.plan.findMany({
      where: { type: kind === "hotspot" ? "hotspot" : "ppp" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        priceSell: true,
        vatPct: true,
        validity: true,
      },
    }),
    prisma.appSetting.findUnique({ where: { key: "odp_list" } }),
  ]);

  const odpFromDb = await prisma.customer.findMany({
    where: { odp: { not: "" } },
    distinct: ["odp"],
    select: { odp: true },
    take: 100,
  });

  const odpSeed = ["ODP-A1", "ODP-B2", "POP-CORE"];
  const odpList = [
    ...new Set([
      ...(odpSetting?.value ? odpSetting.value.split(",").map((s) => s.trim()) : odpSeed),
      ...odpFromDb.map((r) => r.odp),
    ]),
  ].filter(Boolean);

  return NextResponse.json({
    nas: nasRows.filter((n) =>
      kind === "hotspot" ? n.enableHotspot || !n.enablePpp : n.enablePpp || !n.enableHotspot,
    ),
    plans: planRows,
    odp: odpList,
  });
}
