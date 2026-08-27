import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCompanyProfile } from "@/lib/billing";
import { getDb } from "@/lib/db";
import { OPERATOR_COOKIE, OPERATOR_ENV_VALUE } from "@/lib/auth-cookies";

export const runtime = "nodejs";

async function staffLabel(prisma: Awaited<ReturnType<typeof getDb>>) {
  const jar = await cookies();
  const value = jar.get(OPERATOR_COOKIE)?.value;
  if (value === OPERATOR_ENV_VALUE) {
    return process.env.OPERATOR_ADMIN_USER ?? "admin";
  }
  if (value) {
    const staff = await prisma.staffUser.findUnique({
      where: { id: value },
      select: { username: true },
    });
    if (staff) return staff.username;
  }
  return "admin";
}

export async function GET() {
  const prisma = await getDb();
  const [company, alerts, staff] = await Promise.all([
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
    staffLabel(prisma),
  ]);
  return NextResponse.json({
    company: {
      name: company.name,
      tenant: company.name,
      staff,
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
