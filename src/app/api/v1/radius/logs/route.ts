import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const prisma = await getDb();
  const rows = await prisma.radiusLog.findMany({
    orderBy: { at: "desc" },
    take: 100,
  });
  return NextResponse.json({ rows });
}
