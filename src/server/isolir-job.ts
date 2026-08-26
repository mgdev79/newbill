import { prisma } from "@/lib/db";
import { frQuery, isFreeradiusConfigured } from "@/server/freeradius-db";
import type { RowDataPacket } from "mysql2";
import {
  disconnectCustomerSessions,
  syncCustomerRadius,
  syncVoucherRadius,
} from "@/server/freeradius-sync";

const INTERVAL_MS = Number(process.env.FREERADIUS_ISOLIR_INTERVAL_MS ?? 5 * 60 * 1000);

type SchedulerGlobal = { __nbIsolirTimer?: ReturnType<typeof setInterval> };

export async function runIsolirDueJob() {
  const now = new Date();
  const due = await prisma.customer.findMany({
    where: { status: "active", dueAt: { lt: now } },
    include: { plan: { include: { bandwidth: true, group: true } }, nas: true },
  });

  const isolated: string[] = [];
  const errors: string[] = [];

  for (const customer of due) {
    try {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { status: "isolated" },
      });
      await syncCustomerRadius({
        username: customer.username,
        password: customer.password,
        status: "isolated",
        dueAt: customer.dueAt,
        ip: customer.ip,
        kind: customer.kind,
        plan: customer.plan,
      });
      await disconnectCustomerSessions({
        username: customer.username,
        nasIp: customer.nas.ip,
        secret: customer.nas.radiusSecret,
      });
      isolated.push(customer.username);
    } catch (error) {
      errors.push(
        `${customer.username}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  let vouchersMarkedUsed = 0;
  if (isFreeradiusConfigured()) {
    const unused = await prisma.voucher.findMany({
      where: { used: false, enabled: true, expiresAt: { gt: now } },
      select: { id: true, code: true },
      take: 2000,
    });
    for (let i = 0; i < unused.length; i += 100) {
      const chunk = unused.slice(i, i + 100);
      const placeholders = chunk.map(() => "?").join(",");
      try {
        const seen = await frQuery<(RowDataPacket & { username: string })[]>(
          `SELECT DISTINCT username FROM radacct WHERE username IN (${placeholders})`,
          chunk.map((item) => item.code),
        );
        const usedSet = new Set(seen.map((row) => row.username));
        const hit = chunk.filter((item) => usedSet.has(item.code));
        if (hit.length) {
          await prisma.voucher.updateMany({
            where: { id: { in: hit.map((item) => item.id) } },
            data: { used: true },
          });
          vouchersMarkedUsed += hit.length;
        }
      } catch (error) {
        errors.push(
          `radacct voucher: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  const expiredVouchers = await prisma.voucher.findMany({
    where: {
      OR: [{ used: true }, { enabled: false }, { expiresAt: { lt: now } }],
    },
    include: { plan: { include: { bandwidth: true, group: true } } },
    take: 2000,
  });

  let vouchersSynced = 0;
  for (const voucher of expiredVouchers) {
    try {
      await syncVoucherRadius(voucher);
      vouchersSynced += 1;
    } catch (error) {
      errors.push(
        `voucher ${voucher.code}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    ok: errors.length === 0,
    checkedAt: now.toISOString(),
    isolatedCount: isolated.length,
    isolated,
    vouchersMarkedUsed,
    vouchersSynced,
    errors,
  };
}

export function startIsolirScheduler() {
  if (process.env.FREERADIUS_ISOLIR_CRON === "0") return;
  if (process.env.NODE_ENV !== "production" && process.env.FREERADIUS_ISOLIR_CRON !== "1") {
    return;
  }
  const g = globalThis as SchedulerGlobal;
  if (g.__nbIsolirTimer) return;
  g.__nbIsolirTimer = setInterval(() => {
    void runIsolirDueJob().catch((error) => {
      console.error("[isolir-job]", error);
    });
  }, INTERVAL_MS);
  g.__nbIsolirTimer.unref?.();
  console.log(`[isolir-job] scheduler ${INTERVAL_MS}ms`);
}
