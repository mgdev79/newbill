import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { tenantDatabasePath, tenantDatabaseUrl } from "@/lib/tenant-db";
import { tenantSubdomain } from "@/lib/tenant-host";

const TENANT_SCHEMA = path.join(process.cwd(), "prisma", "tenant", "schema.prisma");

/** Buat file SQLite tenant baru dan terapkan schema Prisma. */
export function provisionTenantDatabase(code: string) {
  const normalized = tenantSubdomain(code);
  const dbPath = tenantDatabasePath(normalized);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  if (!fs.existsSync(dbPath)) {
    fs.closeSync(fs.openSync(dbPath, "w"));
  }

  execFileSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["prisma", "db", "push", "--schema", TENANT_SCHEMA, "--skip-generate", "--accept-data-loss"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        TENANT_DATABASE_URL: tenantDatabaseUrl(normalized),
      },
      stdio: process.env.PROVISION_TENANT_VERBOSE === "1" ? "inherit" : "pipe",
    },
  );

  return dbPath;
}

export function tenantDatabaseExists(code: string) {
  return fs.existsSync(tenantDatabasePath(code));
}
