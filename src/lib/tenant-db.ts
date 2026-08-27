import path from "node:path";
import { PrismaClient } from "@/generated/tenant";
import { tenantSubdomain } from "@/lib/tenant-host";

const globalForPrisma = globalThis as unknown as {
  tenantPrismaClients?: Map<string, PrismaClient>;
};

function clientMap() {
  if (!globalForPrisma.tenantPrismaClients) {
    globalForPrisma.tenantPrismaClients = new Map();
  }
  return globalForPrisma.tenantPrismaClients;
}

/** Folder SQLite per tenant (satu file per kode tenant). */
export function tenantDatabaseDir() {
  const fromEnv = process.env.TENANT_DATABASE_DIR?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  }
  return path.join(process.cwd(), "data", "tenants");
}

export function tenantDatabasePath(code: string) {
  const normalized = tenantSubdomain(code);
  return path.join(tenantDatabaseDir(), `${normalized}.db`);
}

export function tenantDatabaseUrl(code: string) {
  const filePath = tenantDatabasePath(code).replace(/\\/g, "/");
  return `file:${filePath}`;
}

export function getTenantPrismaClient(code: string): PrismaClient {
  const normalized = tenantSubdomain(code);
  const map = clientMap();
  const existing = map.get(normalized);
  if (existing) return existing;

  const client = new PrismaClient({
    datasources: { db: { url: tenantDatabaseUrl(normalized) } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  map.set(normalized, client);
  return client;
}

export function disconnectTenantPrismaClient(code: string) {
  const normalized = tenantSubdomain(code);
  const map = clientMap();
  const existing = map.get(normalized);
  if (!existing) return;
  void existing.$disconnect().catch(() => undefined);
  map.delete(normalized);
}

export type { Prisma } from "@/generated/tenant";
export type {
  Customer,
  Plan,
  Nas,
  Invoice,
  Voucher,
  StaffUser,
  RadiusEngine,
  AppSetting,
} from "@/generated/tenant";
