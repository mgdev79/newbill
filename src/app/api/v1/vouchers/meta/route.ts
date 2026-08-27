import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

/** Meta form generate voucher. */
export async function GET(request: Request) {
  const prisma = await getDb();
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") === "ppp" ? "ppp" : "hotspot";

  const [nasRows, planRows] = await Promise.all([
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
      where: { type: kind },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        priceSell: true,
        validity: true,
      },
    }),
  ]);

  return NextResponse.json({
    nas: nasRows.filter((n) =>
      kind === "hotspot" ? n.enableHotspot || !n.enablePpp : n.enablePpp || !n.enableHotspot,
    ),
    plans: planRows,
  });
}
