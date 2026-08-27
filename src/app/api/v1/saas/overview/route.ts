import { NextResponse } from "next/server";
import { platformPrisma as prisma } from "@/lib/platform-db";
import { publicTenant } from "@/lib/saas";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

export const GET = withApiErrorHandling(async function GET() {
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
});
