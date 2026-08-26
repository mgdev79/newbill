import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const cached = globalForPrisma.prisma;
/** HMR: client lama tidak punya model baru sampai proses Next di-restart. */
const stale = Boolean(cached && !("radiusEngine" in cached));

export const prisma = !stale && cached ? cached : createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
