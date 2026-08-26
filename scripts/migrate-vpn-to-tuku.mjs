import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tuku = await prisma.vpnServer.findUnique({ where: { name: "vpn-tuku" } });
  if (!tuku) throw new Error("vpn-tuku tidak ada");

  const demos = await prisma.vpnServer.findMany({
    where: {
      OR: [
        { name: "vpn-id11" },
        { name: "vpn-sg01" },
        { host: { endsWith: ".newbill.local" } },
      ],
      NOT: { id: tuku.id },
    },
  });

  for (const demo of demos) {
    const moved = await prisma.vpnAccount.updateMany({
      where: { serverId: demo.id },
      data: {
        serverId: tuku.id,
        serverHost: tuku.host,
        innerRadiusIp: tuku.innerRadiusIp || undefined,
      },
    });
    console.log(`moved ${moved.count} account(s) from ${demo.name} → vpn-tuku`);
    await prisma.vpnServer.delete({ where: { id: demo.id } });
    console.log(`deleted ${demo.name}`);
  }

  // Pastikan akun orphan demo ikut ke tuku
  await prisma.vpnAccount.updateMany({
    where: {
      OR: [
        { serverHost: { endsWith: ".newbill.local" } },
        { serverId: null },
      ],
    },
    data: {
      serverId: tuku.id,
      serverHost: tuku.host,
      innerRadiusIp: tuku.innerRadiusIp,
    },
  });

  const servers = await prisma.vpnServer.findMany({
    include: { _count: { select: { accounts: true } } },
  });
  console.log(
    "servers:",
    servers.map((s) => `${s.name} ${s.host} accounts=${s._count.accounts}`),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
