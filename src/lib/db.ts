/**
 * Akses database operasional tenant (per-subdomain).
 * Platform DB: `@/lib/platform-db`.
 */
export { getDb, getTenantCode, getRequestTenant, runWithTenant } from "@/lib/tenant-context";
export { getTenantPrismaClient, tenantDatabasePath } from "@/lib/tenant-db";
