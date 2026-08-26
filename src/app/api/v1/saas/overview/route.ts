import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicTenant } from "@/lib/saas";

export const runtime = "nodejs";

export async function GET() {
  const [tenants, servers, plans, vpnCount] = await Promise.all([
    prisma.tenant.findMany({ include: { plan: true }, orderBy: { createdAt: "desc" } }),
    prisma.vpnServer.count(),
    prisma.saasPlan.count(),
    prisma.vpnAccount.count(),
  ]);

  const active = tenants.filter((t) => t.status === "active").length;
  const suspended = tenants.filter((t) => t.status === "suspended").length;

  return NextResponse.json({
    kpis: {
      tenants: tenants.length,
      active,
      suspended,
      vpnServers: servers,
      vpnAccounts: vpnCount,
      plans,
    },
    recent: tenants.slice(0, 8).map(publicTenant),
  });
}
