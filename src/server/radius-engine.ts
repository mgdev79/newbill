import mysql from "mysql2/promise";
import { Client } from "ssh2";
import type { RadiusEngine } from "@prisma/client";
import { prisma } from "@/lib/db";
import { RADIUS_INCOMING_PORT } from "@/lib/nas-ports";

export type RadiusEnginePublic = {
  id: string;
  name: string;
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  hasDbPassword: boolean;
  provisionMethod: "local" | "ssh";
  sshHost: string;
  sshPort: number;
  sshUser: string;
  hasSshPrivateKey: boolean;
  provisionScript: string;
  useSudo: boolean;
  coaPort: number;
  publicIp: string;
  active: boolean;
  lastTestOk: boolean;
  lastTestAt: string | null;
  lastTestError: string;
};

export type RadiusEngineInput = {
  name?: string;
  dbHost: string;
  dbPort?: number;
  dbName?: string;
  dbUser: string;
  dbPassword?: string;
  provisionMethod?: string;
  sshHost?: string;
  sshPort?: number;
  sshUser?: string;
  sshPrivateKey?: string;
  provisionScript?: string;
  useSudo?: boolean;
  coaPort?: number;
  publicIp?: string;
  active?: boolean;
};

export type RadiusEngineTestResult = {
  ok: boolean;
  mysqlOk: boolean;
  sshOk: boolean | null;
  message: string;
};

export function parseMysqlUrl(url: string) {
  const parsed = new URL(url);
  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, "")).split("?")[0] || "radius";
  return {
    dbHost: parsed.hostname || "127.0.0.1",
    dbPort: parsed.port ? Number(parsed.port) : 3306,
    dbName,
    dbUser: decodeURIComponent(parsed.username || ""),
    dbPassword: decodeURIComponent(parsed.password || ""),
  };
}

export function engineFieldsFromEnv(): Omit<RadiusEngineInput, "name"> | null {
  const url = process.env.FREERADIUS_DB_URL?.trim();
  if (!url) return null;
  const db = parseMysqlUrl(url);
  if (!db.dbHost || !db.dbUser) return null;
  return {
    ...db,
    provisionMethod: "local",
    provisionScript:
      process.env.FREERADIUS_PROVISION_SCRIPT?.trim() ||
      "/opt/radius-provision/gen_nas_listener.sh",
    useSudo: process.env.FREERADIUS_PROVISION_SUDO !== "0",
    coaPort: Number(process.env.RADIUS_INCOMING_PORT ?? RADIUS_INCOMING_PORT) || RADIUS_INCOMING_PORT,
    publicIp: process.env.RADIUS_PUBLIC_IP?.trim() || "",
    active: true,
  };
}

export function publicRadiusEngine(row: RadiusEngine): RadiusEnginePublic {
  return {
    id: row.id,
    name: row.name,
    dbHost: row.dbHost,
    dbPort: row.dbPort,
    dbName: row.dbName,
    dbUser: row.dbUser,
    hasDbPassword: Boolean(row.dbPassword),
    provisionMethod: row.provisionMethod === "ssh" ? "ssh" : "local",
    sshHost: row.sshHost,
    sshPort: row.sshPort,
    sshUser: row.sshUser,
    hasSshPrivateKey: Boolean(row.sshPrivateKey),
    provisionScript: row.provisionScript,
    useSudo: row.useSudo,
    coaPort: row.coaPort,
    publicIp: row.publicIp,
    active: row.active,
    lastTestOk: row.lastTestOk,
    lastTestAt: row.lastTestAt?.toISOString() ?? null,
    lastTestError: row.lastTestError,
  };
}

export function radiusEngineConfigHash(row: Pick<RadiusEngine, "dbHost" | "dbPort" | "dbName" | "dbUser" | "dbPassword">) {
  return `${row.dbHost}|${row.dbPort}|${row.dbName}|${row.dbUser}|${row.dbPassword}`;
}

export async function ensureDefaultRadiusEngine() {
  const existing = await prisma.radiusEngine.findFirst({ orderBy: { name: "asc" } });
  if (existing) return existing;
  const fromEnv = engineFieldsFromEnv();
  if (!fromEnv) return null;
  try {
    return await prisma.radiusEngine.create({
      data: {
        name: "default",
        dbHost: fromEnv.dbHost,
        dbPort: fromEnv.dbPort ?? 3306,
        dbName: fromEnv.dbName ?? "radius",
        dbUser: fromEnv.dbUser,
        dbPassword: fromEnv.dbPassword ?? "",
        provisionMethod: "local",
        provisionScript: fromEnv.provisionScript ?? "/opt/radius-provision/gen_nas_listener.sh",
        useSudo: fromEnv.useSudo ?? true,
        coaPort: fromEnv.coaPort ?? RADIUS_INCOMING_PORT,
        publicIp: fromEnv.publicIp ?? "",
        active: true,
      },
    });
  } catch {
    return prisma.radiusEngine.findFirst({ where: { name: "default" } });
  }
}

export async function getActiveRadiusEngine() {
  await ensureDefaultRadiusEngine();
  const active = await prisma.radiusEngine.findFirst({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  if (active) return active;
  return prisma.radiusEngine.findFirst({ orderBy: { name: "asc" } });
}

export async function getRadiusPublicIp() {
  const engine = await getActiveRadiusEngine();
  return engine?.publicIp?.trim() || "";
}

export async function getRadiusCoaPort() {
  const engine = await getActiveRadiusEngine();
  const port = engine?.coaPort || RADIUS_INCOMING_PORT;
  return port > 0 ? port : RADIUS_INCOMING_PORT;
}

export async function activateOnly(id: string) {
  await prisma.$transaction([
    prisma.radiusEngine.updateMany({ data: { active: false } }),
    prisma.radiusEngine.update({ where: { id }, data: { active: true } }),
  ]);
}

export async function testMysqlConnection(input: {
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
}) {
  const conn = await mysql.createConnection({
    host: input.dbHost,
    port: input.dbPort,
    user: input.dbUser,
    password: input.dbPassword,
    database: input.dbName,
    connectTimeout: 8000,
  });
  try {
    await conn.query("SELECT 1");
  } finally {
    await conn.end();
  }
}

export function sshRunCommand(
  input: {
    sshHost: string;
    sshPort: number;
    sshUser: string;
    sshPrivateKey: string;
  },
  command: string,
  timeoutMs = 20_000,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const client = new Client();
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      client.end();
      reject(new Error(`SSH timeout ${timeoutMs}ms`));
    }, timeoutMs);

    function finish(error: Error | null, result?: { stdout: string; stderr: string }) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.end();
      if (error) reject(error);
      else resolve(result!);
    }

    client
      .on("ready", () => {
        client.exec(command, (error, stream) => {
          if (error) {
            finish(error);
            return;
          }
          let stdout = "";
          let stderr = "";
          stream
            .on("close", (code: number | null) => {
              if (code && code !== 0) {
                finish(new Error(stderr.trim() || `SSH exit ${code}`));
                return;
              }
              finish(null, { stdout, stderr });
            })
            .on("data", (chunk: Buffer) => {
              stdout += chunk.toString("utf8");
            });
          stream.stderr?.on("data", (chunk: Buffer) => {
            stderr += chunk.toString("utf8");
          });
        });
      })
      .on("error", (error) => finish(error))
      .connect({
        host: input.sshHost,
        port: input.sshPort || 22,
        username: input.sshUser || "root",
        privateKey: input.sshPrivateKey,
        readyTimeout: Math.min(timeoutMs, 12_000),
      });
  });
}

export async function testRadiusEngineConnection(input: {
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  provisionMethod: string;
  sshHost?: string;
  sshPort?: number;
  sshUser?: string;
  sshPrivateKey?: string;
}): Promise<RadiusEngineTestResult> {
  let mysqlOk = false;
  let sshOk: boolean | null = null;
  const parts: string[] = [];

  try {
    await testMysqlConnection(input);
    mysqlOk = true;
    parts.push("MySQL SELECT 1 OK");
  } catch (error) {
    parts.push(`MySQL gagal: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (input.provisionMethod === "ssh") {
    if (!input.sshHost?.trim() || !input.sshPrivateKey?.trim()) {
      sshOk = false;
      parts.push("SSH gagal: host dan private key wajib.");
    } else {
      try {
        const result = await sshRunCommand(
          {
            sshHost: input.sshHost.trim(),
            sshPort: input.sshPort || 22,
            sshUser: input.sshUser || "root",
            sshPrivateKey: input.sshPrivateKey,
          },
          "echo ok",
          15_000,
        );
        sshOk = /\bok\b/i.test(result.stdout);
        parts.push(sshOk ? "SSH echo ok" : `SSH merespons tanpa ok: ${result.stdout.trim()}`);
      } catch (error) {
        sshOk = false;
        parts.push(`SSH gagal: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  const ok = mysqlOk && sshOk !== false;
  return { ok, mysqlOk, sshOk, message: parts.join(" · ") };
}
