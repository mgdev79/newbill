import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Pastikan paket hotspot setara demo Mixradius tersedia. */
async function main() {
  const bw = await prisma.bandwidth.findFirst({ orderBy: { name: "asc" } });
  const group = await prisma.profileGroup.findFirst({
    where: { type: "hotspot" },
    orderBy: { name: "asc" },
  });
  if (!bw || !group) throw new Error("bandwidth/group hotspot belum ada");

  const plan = await prisma.plan.upsert({
    where: { name: "Hotspot 3 Device" },
    create: {
      name: "Hotspot 3 Device",
      type: "hotspot",
      priceBase: 148649,
      priceSell: 165000,
      vatPct: 11,
      validity: "1 Bulan",
      sharedUsers: 3,
      bandwidthId: bw.id,
      groupId: group.id,
    },
    update: {
      type: "hotspot",
      priceSell: 165000,
      vatPct: 11,
      validity: "1 Bulan",
      sharedUsers: 3,
    },
  });

  // Pastikan ada NAS hotspot enabled
  await prisma.nas.updateMany({
    where: { enableHotspot: false, enablePpp: true },
    data: {},
  });
  const nas = await prisma.nas.findFirst({ where: { enableHotspot: true } });
  if (!nas) {
    await prisma.nas.updateMany({
      data: { enableHotspot: true },
    });
  }

  console.log("plan", plan.name, plan.priceSell, "nasHotspot", !!nas || "enabled-all");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
