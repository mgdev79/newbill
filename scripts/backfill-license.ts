import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.tenant.update({
    where: { code: "ariyana" },
    data: {
      expiresAt: new Date("2026-09-25"),
      activatedAt: new Date("2023-09-25T20:52:16"),
      requestId: "NB2 | ARIYANA-DEMO-REQUEST-ID-SEED",
      hardwareId: "XX-XX-XX-XX-XX-XX",
      softwareKey: "@NEWBILL | ARIYANA-SOFTWARE-KEY-DEMO-SEED",
      sessionLimit: 300,
    },
  });
  await prisma.saasPlan.updateMany({
    where: { code: "NB-LITE-1" },
    data: {
      sessionLimit: 300,
      routerLimit: 2,
      customerLimit: 500,
      voucherLimit: 30000,
    },
  });
  await prisma.appSetting.upsert({
    where: { key: "billing_tenant_code" },
    create: { key: "billing_tenant_code", value: "ariyana" },
    update: { value: "ariyana" },
  });
  await prisma.appSetting.upsert({
    where: { key: "core_radius_status" },
    create: { key: "core_radius_status", value: "running" },
    update: { value: "running" },
  });
  console.log("license fields ok");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
