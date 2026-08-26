import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.saasPlan.findMany({
    select: { id: true, code: true, name: true, vpnQuota: true },
  });
  console.log("plans", plans);

  const tenant = await prisma.tenant.findUnique({
    where: { code: "ariyana" },
    include: { plan: true, vpnAccounts: true },
  });
  if (!tenant) throw new Error("no ariyana");

  console.log("tenant plan", tenant.plan.code, "quota", tenant.plan.vpnQuota);
  console.log(
    "vpn accounts",
    tenant.vpnAccounts.map((a) => ({ id: a.id, user: a.username, host: a.serverHost })),
  );

  const updated = await prisma.saasPlan.update({
    where: { id: tenant.planId },
    data: { vpnQuota: Math.max(tenant.plan.vpnQuota, 3) },
  });
  console.log("quota now", updated.vpnQuota);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
