import { PrismaClient } from "@/generated/platform";

const globalForPrisma = globalThis as unknown as { platformPrisma?: PrismaClient };

function createClient() {
  const url =
    process.env.PLATFORM_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "file:./prisma/platform.db";
  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const cached = globalForPrisma.platformPrisma;
export const platformPrisma = cached ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.platformPrisma = platformPrisma;
}

export type { Prisma } from "@/generated/platform";
export type {
  Tenant,
  SaasPlan,
  VpnServer,
  VpnAccount,
  PlatformGatewaySetting,
  TenantSignupOrder,
  PlatformSetting,
} from "@/generated/platform";
