import { PrismaClient } from "@prisma/client";
import { engineFieldsFromEnv } from "@/server/radius-engine";

const prisma = new PrismaClient();
const PASSWORD = "radius123";

async function main() {
  await prisma.radiusLog.deleteMany();
  await prisma.radAcct.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.profileGroup.deleteMany();
  await prisma.bandwidth.deleteMany();
  await prisma.nas.deleteMany();

  const nasCore = await prisma.nas.create({
    data: {
      name: "CORE-PPPOE",
      ip: "10.10.10.1",
      description: "Router utama PPPoE",
      radiusSecret: "testing123",
      enablePpp: true,
      healthy: true,
    },
  });
  const nasHs = await prisma.nas.create({
    data: {
      name: "HOTSPOT-CABANG",
      ip: "10.10.20.1",
      healthy: false,
      description: "Hotspot cafe cabang",
      radiusSecret: "testing123",
      enablePpp: false,
      enableHotspot: true,
    },
  });

  const bw10 = await prisma.bandwidth.create({
    data: { name: "10M", minUp: "2M", maxUp: "10M", minDown: "2M", maxDown: "10M" },
  });
  const bw20 = await prisma.bandwidth.create({
    data: { name: "20M", minUp: "5M", maxUp: "20M", minDown: "5M", maxDown: "20M" },
  });
  const bw50 = await prisma.bandwidth.create({
    data: { name: "50M", minUp: "10M", maxUp: "50M", minDown: "10M", maxDown: "50M" },
  });

  const gHome = await prisma.profileGroup.create({
    data: {
      name: "PPPOE-HOME",
      type: "ppp",
      nasId: nasCore.id,
      pool: "10.20.0.10-10.20.0.250",
    },
  });
  const gBiz = await prisma.profileGroup.create({
    data: {
      name: "PPPOE-BIZ",
      type: "ppp",
      nasId: nasCore.id,
      pool: "10.30.0.10-10.30.0.80",
    },
  });
  const gHs = await prisma.profileGroup.create({
    data: {
      name: "HS-GUEST",
      type: "hotspot",
      nasId: nasHs.id,
      pool: "192.168.50.10-192.168.50.200",
    },
  });

  const plan20 = await prisma.plan.create({
    data: {
      name: "Rumah 20Mbps",
      type: "ppp",
      priceBase: 185000,
      priceSell: 200000,
      validity: "30 hari",
      bandwidthId: bw20.id,
      groupId: gHome.id,
    },
  });
  const plan10 = await prisma.plan.create({
    data: {
      name: "Rumah 10Mbps",
      type: "ppp",
      priceBase: 140000,
      priceSell: 150000,
      validity: "30 hari",
      bandwidthId: bw10.id,
      groupId: gHome.id,
    },
  });
  const plan50 = await prisma.plan.create({
    data: {
      name: "Usaha 50Mbps",
      type: "ppp",
      priceBase: 320000,
      priceSell: 350000,
      vatPct: 11,
      validity: "30 hari",
      bandwidthId: bw50.id,
      groupId: gBiz.id,
    },
  });
  const planHs1 = await prisma.plan.create({
    data: {
      name: "Hotspot 1 Hari",
      type: "hotspot",
      priceBase: 5000,
      priceSell: 5000,
      validity: "1 hari",
      bandwidthId: bw10.id,
      groupId: gHs.id,
    },
  });
  const planHs7 = await prisma.plan.create({
    data: {
      name: "Hotspot 7 Hari",
      type: "hotspot",
      priceBase: 25000,
      priceSell: 25000,
      validity: "7 hari",
      bandwidthId: bw10.id,
      groupId: gHs.id,
    },
  });

  await prisma.customer.createMany({
    data: [
      {
        customerCode: "8829103341",
        name: "Budi Santoso",
        username: "budi.s",
        password: PASSWORD,
        serviceType: "pppoe",
        kind: "ppp",
        ip: "10.20.0.14",
        dueAt: new Date("2026-09-05"),
        status: "active",
        payMode: "prepaid",
        nasId: nasCore.id,
        planId: plan20.id,
        odp: "ODP-A1",
        bindOnLogin: true,
        boundMac: "4c5e0c112233",
      },
      {
        customerCode: "8829103342",
        name: "Siti Aminah",
        username: "siti.a",
        password: PASSWORD,
        serviceType: "pppoe",
        kind: "ppp",
        ip: "10.20.0.22",
        dueAt: new Date("2026-08-28"),
        status: "isolated",
        payMode: "prepaid",
        nasId: nasCore.id,
        planId: plan10.id,
        odp: "ODP-A2",
      },
      {
        customerCode: "8829103343",
        name: "Agus Wijaya",
        username: "agus.w",
        password: PASSWORD,
        serviceType: "pppoe",
        kind: "ppp",
        ip: "10.20.0.8",
        dueAt: new Date("2026-09-12"),
        status: "active",
        payMode: "postpaid",
        nasId: nasCore.id,
        planId: plan50.id,
        odp: "ODP-B1",
        bindOnLogin: true,
        boundMac: "a4cf12445566",
      },
      {
        customerCode: "8829103344",
        name: "Dewi Lestari",
        username: "dewi.l",
        password: PASSWORD,
        serviceType: "pppoe",
        kind: "ppp",
        ip: "10.20.0.41",
        dueAt: new Date("2026-08-20"),
        status: "disabled",
        payMode: "prepaid",
        owner: "reseller-1",
        nasId: nasCore.id,
        planId: plan10.id,
        odp: "ODP-A1",
      },
      {
        customerCode: "8829103345",
        name: "Rudi Hartono",
        username: "rudi.h",
        password: PASSWORD,
        serviceType: "pppoe",
        kind: "ppp",
        ip: "10.20.0.55",
        dueAt: new Date("2026-09-01"),
        status: "pending",
        payMode: "prepaid",
        nasId: nasCore.id,
        planId: plan20.id,
        odp: "ODP-C1",
      },
      {
        customerCode: "HS-10021",
        name: "Cafe Tamu 1",
        username: "cafe1",
        password: PASSWORD,
        serviceType: "hotspot",
        kind: "hotspot",
        ip: "192.168.50.21",
        dueAt: new Date("2026-09-02"),
        status: "active",
        payMode: "prepaid",
        nasId: nasHs.id,
        planId: planHs7.id,
        bindOnLogin: true,
        boundMac: "b827eb001122",
      },
    ],
  });

  await prisma.voucher.create({
    data: {
      code: "ARIY-8K2P",
      password: "ARIY-8K2P",
      kind: "hotspot",
      expiresAt: new Date("2026-09-20"),
      nasId: nasHs.id,
      planId: planHs1.id,
    },
  });

  await prisma.radAcct.createMany({
    data: [
      {
        sessionId: "sess-agus-1",
        username: "agus.w",
        kind: "ppp",
        nasIp: "10.10.10.1",
        framedIp: "10.20.0.8",
        callingStationId: "A4:CF:12:44:55:66",
        nasId: nasCore.id,
      },
    ],
  });

  await prisma.vpnAccount.deleteMany();
  await prisma.tenant.deleteMany();
  // Jangan hapus VpnServer — upsert supaya password/API user yang diisi admin tidak hilang tiap seed.
  await prisma.saasPlan.deleteMany();

  const planLite = await prisma.saasPlan.create({
    data: {
      name: "NB Lite 1",
      code: "NB-LITE-1",
      priceMonth: 50000,
      vpnQuota: 3,
      routerLimit: 2,
      customerLimit: 500,
      voucherLimit: 30000,
      sessionLimit: 300,
      description: "Paket starter self-host SaaS",
    },
  });
  await prisma.saasPlan.create({
    data: {
      name: "NB Medium",
      code: "NB-MED",
      priceMonth: 150000,
      vpnQuota: 3,
      routerLimit: 3,
      customerLimit: 750,
      voucherLimit: 50000,
      sessionLimit: 600,
    },
  });
  await prisma.saasPlan.create({
    data: {
      name: "NB Pro",
      code: "NB-PRO",
      priceMonth: 600000,
      vpnQuota: 5,
      routerLimit: 20,
      customerLimit: 999999,
      voucherLimit: 999999,
      sessionLimit: 5000,
    },
  });

  const vpnTuku = await prisma.vpnServer.upsert({
    where: { name: "vpn-tuku" },
    create: {
      name: "vpn-tuku",
      host: "41.216.186.213",
      region: "Indonesia",
      online: true,
      innerRadiusIp: "172.31.20.1",
      note: "CHR-PROMAX pool",
      apiUser: "juragan",
      apiPort: 8728,
    },
    update: {
      // Jangan timpa host/password yang sudah diubah admin.
      region: "Indonesia",
    },
  });

  // Bersihkan sisa pool demo lokal jika masih ada
  const demoServers = await prisma.vpnServer.findMany({
    where: {
      OR: [{ name: "vpn-id11" }, { name: "vpn-sg01" }, { host: { endsWith: ".newbill.local" } }],
      NOT: { id: vpnTuku.id },
    },
  });
  for (const demo of demoServers) {
    await prisma.vpnAccount.updateMany({
      where: { serverId: demo.id },
      data: {
        serverId: vpnTuku.id,
        serverHost: vpnTuku.host,
        innerRadiusIp: vpnTuku.innerRadiusIp,
      },
    });
    await prisma.vpnServer.delete({ where: { id: demo.id } });
  }

  const tenant = await prisma.tenant.create({
    data: {
      code: "ariyana",
      name: "Ariyana ID",
      email: "tenant@ariyana.local",
      password: "tenant123",
      phone: "6281200000000",
      status: "active",
      planId: planLite.id,
      billingUrl: "http://localhost:3000",
      radiusPublicIp: "192.168.20.29",
      notes: "Tenant demo Newbill",
      expiresAt: new Date("2026-09-25"),
      activatedAt: new Date("2023-09-25T20:52:16"),
      requestId: "NB2 | ARIYANA-DEMO-REQUEST-ID-SEED",
      hardwareId: "XX-XX-XX-XX-XX-XX",
      softwareKey: "@NEWBILL | ARIYANA-SOFTWARE-KEY-DEMO-SEED",
      sessionLimit: 300,
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
  await prisma.appSetting.upsert({
    where: { key: "company_name" },
    create: { key: "company_name", value: "Ariyana ID" },
    update: { value: "Ariyana ID" },
  });
  await prisma.appSetting.upsert({
    where: { key: "company_address" },
    create: { key: "company_address", value: "Perumahan Kota Baru Keandra" },
    update: { value: "Perumahan Kota Baru Keandra" },
  });
  await prisma.appSetting.upsert({
    where: { key: "company_phone" },
    create: { key: "company_phone", value: "087715640895" },
    update: { value: "087715640895" },
  });

  await prisma.vpnAccount.create({
    data: {
      label: "ariyana-vpn1",
      username: "ariyana15236@newbill.local",
      password: "vpnDemoPass1",
      type: "l2tp",
      innerRadiusIp: vpnTuku.innerRadiusIp,
      serverHost: vpnTuku.host,
      serverId: vpnTuku.id,
      tenantId: tenant.id,
      note: "online",
      enabled: true,
    },
  });

  const engineFields = engineFieldsFromEnv();
  if (engineFields) {
    await prisma.radiusEngine.upsert({
      where: { name: "default" },
      create: {
        name: "default",
        dbHost: engineFields.dbHost,
        dbPort: engineFields.dbPort ?? 3306,
        dbName: engineFields.dbName ?? "radius",
        dbUser: engineFields.dbUser,
        dbPassword: engineFields.dbPassword ?? "",
        provisionMethod: "local",
        provisionScript:
          engineFields.provisionScript ?? "/opt/radius-provision/gen_nas_listener.sh",
        useSudo: engineFields.useSudo ?? true,
        coaPort: engineFields.coaPort ?? 3799,
        publicIp: engineFields.publicIp ?? "",
        active: true,
      },
      update: {},
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
