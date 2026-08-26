import { prisma } from "@/lib/db";
import {
  disconnectCustomerSessions,
  removeNasRadius,
  removeRadiusUsername,
  syncCustomerRadius,
  syncNasRadius,
  syncVoucherRadius,
  type NasRadiusPorts,
} from "@/server/freeradius-sync";

export async function syncCustomerById(
  id: string,
  opts?: { previousUsername?: string; disconnectIfBlocked?: boolean },
) {
  const row = await prisma.customer.findUnique({
    where: { id },
    include: { plan: { include: { bandwidth: true, group: true } }, nas: true },
  });
  if (!row) return { skipped: true as const, missing: true as const };

  if (opts?.previousUsername && opts.previousUsername !== row.username) {
    await removeRadiusUsername(opts.previousUsername);
  }

  const result = await syncCustomerRadius(row);
  const shouldDrop =
    opts?.disconnectIfBlocked &&
    !result.skipped &&
    (!("allow" in result && result.allow) || ("isolated" in result && result.isolated));

  if (shouldDrop) {
    await disconnectCustomerSessions({
      username: row.username,
      nasIp: row.nas.ip,
      secret: row.nas.radiusSecret,
    });
  }
  return result;
}

export async function syncVoucherById(id: string) {
  const row = await prisma.voucher.findUnique({
    where: { id },
    include: { plan: { include: { bandwidth: true, group: true } } },
  });
  if (!row) return { skipped: true as const, missing: true as const };
  return syncVoucherRadius(row);
}

export async function removeVoucherRadius(code: string) {
  await removeRadiusUsername(code);
}

export async function syncNasByRecord(
  nas: Parameters<typeof syncNasRadius>[0],
  previous?: { name: string; ip: string },
) {
  return syncNasRadius(nas, previous);
}

export async function removeNasByRecord(nas: { name: string; ip: string }) {
  return removeNasRadius(nas);
}

export function radiusMeta(result: unknown) {
  if (!result || typeof result !== "object") return undefined;
  const row = result as { skipped?: boolean; provisionError?: string; reason?: string };
  if (row.skipped) return { radiusSync: "skipped" as const };
  if (row.provisionError) {
    return { radiusSync: "error" as const, message: row.provisionError };
  }
  return { radiusSync: "ok" as const, ...(row as NasRadiusPorts) };
}
