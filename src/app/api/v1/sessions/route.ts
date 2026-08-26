import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const online = url.searchParams.get("online") !== "0";
  const rows = await prisma.radAcct.findMany({
    where: {
      ...(kind ? { kind } : {}),
      ...(online ? { stoppedAt: null } : {}),
    },
    orderBy: { startedAt: "desc" },
    take: 200,
  });
  return NextResponse.json({
    rows: rows.map((row) => ({
      ...row,
      inputOctets: row.inputOctets.toString(),
      outputOctets: row.outputOctets.toString(),
    })),
  });
}
