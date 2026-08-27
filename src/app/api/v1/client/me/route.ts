import { NextResponse } from "next/server";
import { getTenantSession, publicTenant, publicVpnAccount } from "@/lib/saas";
import { platformPrisma as prisma } from "@/lib/platform-db";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

export const GET = withApiErrorHandling(async function GET() {
  const session = await getTenantSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const vpnAccounts = await prisma.vpnAccount.findMany({
    where: { tenantId: session.id },
    include: { server: true },
    orderBy: { label: "asc" },
  });

  return NextResponse.json({
    tenant: publicTenant(session),
    vpnAccounts: vpnAccounts.map(publicVpnAccount),
  });
});
