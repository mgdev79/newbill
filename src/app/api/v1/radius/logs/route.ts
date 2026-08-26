import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const rows = await prisma.radiusLog.findMany({
    orderBy: { at: "desc" },
    take: 100,
  });
  return NextResponse.json({ rows });
}
