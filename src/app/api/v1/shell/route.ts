import { NextResponse } from "next/server";
import { getCompanyProfile } from "@/lib/billing";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const [company, alerts] = await Promise.all([
    getCompanyProfile(),
    prisma.customer.findMany({
      where: { status: { in: ["isolated", "disabled"] } },
      select: {
        id: true,
        name: true,
        status: true,
        dueAt: true,
        kind: true,
      },
      orderBy: { dueAt: "asc" },
      take: 20,
    }),
  ]);
  return NextResponse.json({
    company: {
      name: company.name,
      tenant: company.name,
      staff: "admin",
    },
    alerts: alerts.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      dueAt: row.dueAt.toISOString(),
      kind: row.kind,
    })),
  });
}
