import { prisma } from "@/lib/db";
import { frQuery, isFreeradiusConfigured } from "@/server/freeradius-db";
import type { RowDataPacket } from "mysql2";

type FrAcctRow = RowDataPacket & {
  acctsessionid: string;
  nasipaddress: string;
};

/** Gabung sesi aktif SQLite + radacct FreeRADIUS, unik per session id. */
export async function onlineUsersByNas(nasRows: { id: string; ip: string }[]) {
  const counts = new Map<string, number>();
  const sets = new Map<string, Set<string>>();
  const byIp = new Map<string, string>();
  for (const nas of nasRows) {
    sets.set(nas.id, new Set());
    counts.set(nas.id, 0);
    byIp.set(nas.ip, nas.id);
  }

  const local = await prisma.radAcct.findMany({
    where: { stoppedAt: null },
    select: { nasId: true, nasIp: true, sessionId: true },
  });
  for (const row of local) {
    const nasId = row.nasId || byIp.get(row.nasIp);
    if (!nasId) continue;
    sets.get(nasId)?.add(row.sessionId);
  }

  if (isFreeradiusConfigured()) {
    try {
      const remote = await frQuery<FrAcctRow[]>(
        "SELECT acctsessionid, nasipaddress FROM radacct WHERE acctstoptime IS NULL",
      );
      for (const row of remote) {
        const nasId = byIp.get(row.nasipaddress);
        if (!nasId) continue;
        sets.get(nasId)?.add(row.acctsessionid);
      }
    } catch {
      // radacct MySQL opsional
    }
  }

  for (const [nasId, sessionIds] of sets) {
    counts.set(nasId, sessionIds.size);
  }
  return counts;
}
