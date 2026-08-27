import { AsyncLocalStorage } from "node:async_hooks";
import { cache } from "react";
import { headers } from "next/headers";
import { platformPrisma } from "@/lib/platform-db";
import { getTenantPrismaClient } from "@/lib/tenant-db";
import type { PrismaClient } from "@/generated/tenant";

const tenantCodeStorage = new AsyncLocalStorage<string>();

export class TenantNotFoundError extends Error {
  constructor(code: string) {
    super(`Tenant "${code}" tidak ditemukan.`);
    this.name = "TenantNotFoundError";
  }
}

export class MissingTenantContextError extends Error {
  constructor() {
    super("Request ini membutuhkan subdomain tenant (mis. tenant-a.juraganlapak.com).");
    this.name = "MissingTenantContextError";
  }
}

/** Jalankan fungsi dengan konteks tenant (background job, provisioning). */
export function runWithTenant<T>(code: string, fn: () => T | Promise<T>): Promise<T> {
  return Promise.resolve(tenantCodeStorage.run(code, fn));
}

export function getTenantCodeFromStorage() {
  return tenantCodeStorage.getStore() ?? null;
}

/** Subdomain mentah dari middleware (belum divalidasi ke platform DB). */
export async function getTenantSubdomainHeader() {
  const h = await headers();
  return h.get("x-tenant-subdomain")?.trim().toLowerCase() || null;
}

const resolveTenantCode = cache(async (): Promise<string | null> => {
  const fromStorage = getTenantCodeFromStorage();
  if (fromStorage) return fromStorage;

  const sub = await getTenantSubdomainHeader();
  if (!sub) return null;

  const tenant = await platformPrisma.tenant.findUnique({
    where: { code: sub },
    select: { code: true, status: true },
  });
  if (!tenant) {
    throw new TenantNotFoundError(sub);
  }
  return tenant.code;
});

/** Kode tenant aktif untuk request/job saat ini. */
export async function getTenantCode(): Promise<string> {
  const code = await resolveTenantCode();
  if (!code) throw new MissingTenantContextError();
  return code;
}

/** Prisma client ke database operasional tenant aktif. */
export const getDb = cache(async (): Promise<PrismaClient> => {
  const code = await getTenantCode();
  return getTenantPrismaClient(code);
});

/** Tenant platform record untuk subdomain request saat ini. */
export const getRequestTenant = cache(async () => {
  const code = await getTenantCode();
  return platformPrisma.tenant.findUnique({
    where: { code },
    include: { plan: true },
  });
});
