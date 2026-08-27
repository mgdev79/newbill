import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dbPath = path.join(process.cwd(), "data", "tenants", "_template.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
if (!fs.existsSync(dbPath)) {
  fs.closeSync(fs.openSync(dbPath, "w"));
}

const url = `file:${dbPath.replace(/\\/g, "/")}`;
execFileSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["prisma", "db", "push", "--schema", "prisma/tenant/schema.prisma", "--skip-generate"],
  {
    cwd: process.cwd(),
    env: { ...process.env, TENANT_DATABASE_URL: url },
    stdio: "inherit",
  },
);
