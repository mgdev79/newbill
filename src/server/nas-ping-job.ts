import { prisma } from "@/lib/db";
import { testMikrotikApi } from "@/server/mikrotik/api";

const INTERVAL_MS = Number(process.env.NAS_PING_INTERVAL_MS ?? 5 * 60 * 1000);

type SchedulerGlobal = { __nbNasPingTimer?: ReturnType<typeof setInterval> };

export async function pingNas(row: {
  id: string;
  ip: string;
  apiPort: number;
  apiUser: string;
  apiPassword: string;
  useSsl: boolean;
  timeoutSec: number;
  lastSeenAt: Date | null;
}) {
  if (!row.apiPassword) {
    await prisma.nas.update({
      where: { id: row.id },
      data: {
        healthy: false,
        lastError: "Password API belum disimpan.",
      },
    });
    return { id: row.id, ok: false, message: "Password API belum disimpan." };
  }

  const result = await testMikrotikApi({
    host: row.ip,
    port: row.apiPort,
    user: row.apiUser,
    password: row.apiPassword,
    useSsl: row.useSsl,
    timeoutMs: (row.timeoutSec || 5) * 1000,
  });

  await prisma.nas.update({
    where: { id: row.id },
    data: {
      healthy: result.ok,
      lastSeenAt: result.ok ? new Date() : row.lastSeenAt,
      lastError: result.ok ? "" : result.message,
    },
  });

  return { id: row.id, ok: result.ok, message: result.message };
}

export async function runNasPingJob() {
  const rows = await prisma.nas.findMany({
    where: { enabled: true },
    orderBy: { name: "asc" },
  });
  const results: { id: string; ok: boolean; message: string }[] = [];
  for (const row of rows) {
    try {
      results.push(await pingNas(row));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await prisma.nas.update({
        where: { id: row.id },
        data: { healthy: false, lastError: message },
      });
      results.push({ id: row.id, ok: false, message });
    }
  }
  return {
    ok: results.every((item) => item.ok),
    checkedAt: new Date().toISOString(),
    count: results.length,
    results,
  };
}

export function startNasPingScheduler() {
  if (process.env.NAS_PING_CRON === "0") return;
  if (process.env.NODE_ENV !== "production" && process.env.NAS_PING_CRON !== "1") {
    return;
  }
  const g = globalThis as SchedulerGlobal;
  if (g.__nbNasPingTimer) return;
  void runNasPingJob().catch((error) => console.error("[nas-ping]", error));
  g.__nbNasPingTimer = setInterval(() => {
    void runNasPingJob().catch((error) => {
      console.error("[nas-ping]", error);
    });
  }, INTERVAL_MS);
  g.__nbNasPingTimer.unref?.();
  console.log(`[nas-ping] scheduler ${INTERVAL_MS}ms`);
}
