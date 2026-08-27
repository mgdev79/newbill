/**
 * Migrasi satu-kali dari database monolith lama (prisma/dev.db atau prisma/prod.db)
 * ke platform.db + data/tenants/{code}.db
 *
 * Usage:
 *   npx tsx scripts/migrate-legacy-db.ts --source=prisma/prod.db --tenant=ariyana
 *
 * File sumber TIDAK dihapus. Jalankan sekali saat rollout multi-tenant.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PrismaClient as LegacyClient } from "@prisma/client";
import { PrismaClient as PlatformClient } from "../src/generated/platform/index.js";
import { PrismaClient as TenantClient } from "../src/generated/tenant/index.js";
import { tenantDatabasePath, tenantDatabaseUrl } from "../src/lib/tenant-db";

function parseArgs() {
  const source =
    process.argv.find((a) => a.startsWith("--source="))?.split("=")[1] ||
    "prisma/prod.db";
  const tenant =
    process.argv.find((a) => a.startsWith("--tenant="))?.split("=")[1] || "ariyana";
  const platformOut =
    process.argv.find((a) => a.startsWith("--platform="))?.split("=")[1] ||
    "prisma/platform.db";
  return { source, tenant, platformOut };
}

async function main() {
  const { source, tenant, platformOut } = parseArgs();
  const sourcePath = path.resolve(source);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Database sumber tidak ada: ${sourcePath}`);
  }

  const legacy = new LegacyClient({
    datasources: { db: { url: `file:${sourcePath.replace(/\\/g, "/")}` } },
  });

  fs.mkdirSync(path.dirname(path.resolve(platformOut)), { recursive: true });
  if (!fs.existsSync(platformOut)) {
    fs.closeSync(fs.openSync(platformOut, "w"));
  }
  execFileSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["prisma", "db", "push", "--schema", "prisma/platform/schema.prisma", "--skip-generate"],
    {
      env: {
        ...process.env,
        PLATFORM_DATABASE_URL: `file:${path.resolve(platformOut).replace(/\\/g, "/")}`,
      },
      stdio: "inherit",
    },
  );

  const platform = new PlatformClient({
    datasources: {
      db: { url: `file:${path.resolve(platformOut).replace(/\\/g, "/")}` },
    },
  });

  const plans = await legacy.saasPlan.findMany();
  for (const row of plans) {
    await platform.saasPlan.upsert({
      where: { id: row.id },
      create: row,
      update: row,
    });
  }

  const tenants = await legacy.tenant.findMany();
  for (const row of tenants) {
    await platform.tenant.upsert({
      where: { id: row.id },
      create: row,
      update: row,
    });
  }

  const vpnServers = await legacy.vpnServer.findMany();
  for (const row of vpnServers) {
    await platform.vpnServer.upsert({
      where: { id: row.id },
      create: row,
      update: row,
    });
  }

  const vpnAccounts = await legacy.vpnAccount.findMany();
  for (const row of vpnAccounts) {
    await platform.vpnAccount.upsert({
      where: { id: row.id },
      create: row,
      update: row,
    });
  }

  try {
    const pg = await legacy.platformGatewaySetting.findUnique({ where: { id: "platform" } });
    if (pg) {
      await platform.platformGatewaySetting.upsert({
        where: { id: "platform" },
        create: pg,
        update: pg,
      });
    }
  } catch {
    // model mungkin belum ada di DB lama
  }

  try {
    const orders = await legacy.tenantSignupOrder.findMany();
    for (const row of orders) {
      await platform.tenantSignupOrder.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
    }
  } catch {
    // optional
  }

  const billing = await legacy.appSetting.findUnique({ where: { key: "billing_tenant_code" } });
  if (billing) {
    await platform.platformSetting.upsert({
      where: { key: billing.key },
      create: billing,
      update: { value: billing.value },
    });
  }

  const tenantCode = tenant.trim().toLowerCase();
  const dbPath = tenantDatabasePath(tenantCode);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.closeSync(fs.openSync(dbPath, "w"));
  }
  execFileSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["prisma", "db", "push", "--schema", "prisma/tenant/schema.prisma", "--skip-generate"],
    {
      env: { ...process.env, TENANT_DATABASE_URL: tenantDatabaseUrl(tenantCode) },
      stdio: "inherit",
    },
  );

  const tenantDb = new TenantClient({
    datasources: { db: { url: tenantDatabaseUrl(tenantCode) } },
  });

  const copyOrder = [
    "nas",
    "bandwidth",
    "profileGroup",
    "plan",
    "customer",
    "invoice",
    "voucher",
    "evoucherOrder",
    "voucherTemplate",
    "radAcct",
    "radiusLog",
    "odp",
    "neighbor",
    "ticket",
    "staffUser",
    "financePayout",
    "financeTopup",
    "paymentTxn",
    "activityLog",
    "radiusEngine",
    "appSetting",
  ] as const;

  for (const model of copyOrder) {
    // @ts-expect-error dynamic legacy access
    const rows = await legacy[model].findMany();
    for (const row of rows) {
      // @ts-expect-error dynamic tenant access
      await tenantDb[model].upsert({ where: { id: row.id }, create: row, update: row });
    }
    console.log(`Copied ${model}: ${rows.length}`);
  }

  for (const row of await legacy.ticket.findMany({ include: { replies: true } })) {
    await tenantDb.ticket.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        subject: row.subject,
        customer: row.customer,
        status: row.status,
        body: row.body,
        createdAt: row.createdAt,
      },
      update: {},
    });
    for (const reply of row.replies) {
      await tenantDb.ticketReply.upsert({
        where: { id: reply.id },
        create: reply,
        update: reply,
      });
    }
  }

  await legacy.$disconnect();
  await platform.$disconnect();
  await tenantDb.$disconnect();

  console.log(`Selesai. Platform: ${platformOut}, tenant ${tenantCode}: ${dbPath}`);
  console.log("File sumber tidak diubah.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
