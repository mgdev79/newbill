import type { Nas } from "@prisma/client";
import { RADIUS_INCOMING_PORT } from "@/lib/nas-ports";
import { toPublicNas, type NasPublic } from "@/lib/nas-dto";
import { incomingPort, listNasRadiusPorts } from "@/server/freeradius-sync";

export async function nasPortsIndex() {
  const rows = await listNasRadiusPorts().catch(() => []);
  const byName = new Map<string, (typeof rows)[number]>();
  const byIp = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    byName.set(row.shortname, row);
    byIp.set(row.nasname, row);
  }
  return { byName, byIp };
}

export function mergeNasPublic(
  nas: Nas,
  index: Awaited<ReturnType<typeof nasPortsIndex>>,
  extra?: { userOnline?: number },
): NasPublic {
  const ports = index.byName.get(nas.name) ?? index.byIp.get(nas.ip);
  return toPublicNas(nas, {
    radiusAuthPort: ports?.radiusAuthPort || null,
    radiusAcctPort: ports?.radiusAcctPort || null,
    userOnline: extra?.userOnline ?? 0,
  });
}

export function radiusIncomingPort() {
  return Number(process.env.RADIUS_INCOMING_PORT ?? incomingPort() ?? RADIUS_INCOMING_PORT);
}
