import { getDb } from "@/lib/db";
import { frQuery, isFreeradiusConfigured } from "@/server/freeradius-db";
import type { RowDataPacket } from "mysql2";

type FrAcctRow = RowDataPacket & {
  acctsessionid: string;
  username: string;
  nasipaddress: string;
  framedipaddress?: string;
  callingstationid?: string;
  acctstarttime?: Date | string | null;
  acctsessiontime?: number | null;
  acctinputoctets?: number | string | null;
  acctoutputoctets?: number | string | null;
};

export type LiveSession = {
  sessionId: string;
  username: string;
  name: string;
  nasIp: string;
  framedIp: string;
  callingStationId: string;
  kind: string;
  startedAt: string;
  sessionTime: number;
  inputOctets: string;
  outputOctets: string;
};

function asIso(value: Date | string | null | undefined) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

export async function listLiveSessions(kind?: string): Promise<LiveSession[]> {
  const prisma = await getDb();
  const map = new Map<string, LiveSession>();

  const local = await prisma.radAcct.findMany({
    where: { stoppedAt: null, ...(kind ? { kind } : {}) },
    include: { customer: { select: { name: true } }, nas: { select: { name: true } } },
    orderBy: { startedAt: "desc" },
    take: 500,
  });
  for (const row of local) {
    map.set(row.sessionId, {
      sessionId: row.sessionId,
      username: row.username,
      name: row.customer?.name || row.username,
      nasIp: row.nas?.name || row.nasIp,
      framedIp: row.framedIp,
      callingStationId: row.callingStationId,
      kind: row.kind,
      startedAt: row.startedAt.toISOString(),
      sessionTime: row.sessionTime,
      inputOctets: row.inputOctets.toString(),
      outputOctets: row.outputOctets.toString(),
    });
  }

  if (await isFreeradiusConfigured()) {
    try {
      const remote = await frQuery<FrAcctRow[]>(
        `SELECT acctsessionid, username, nasipaddress, framedipaddress, callingstationid,
                acctstarttime, acctsessiontime, acctinputoctets, acctoutputoctets
         FROM radacct WHERE acctstoptime IS NULL`,
      );
      const usernames = [...new Set(remote.map((row) => row.username).filter(Boolean))];
      const [customers, vouchers] = usernames.length
        ? await Promise.all([
            prisma.customer.findMany({
              where: { username: { in: usernames } },
              select: { username: true, name: true, kind: true },
            }),
            prisma.voucher.findMany({
              where: { code: { in: usernames } },
              select: { code: true, kind: true },
            }),
          ])
        : [[], []];
      const customerByUser = new Map(customers.map((row) => [row.username, row]));
      const voucherByCode = new Map(vouchers.map((row) => [row.code, row]));

      for (const row of remote) {
        if (map.has(row.acctsessionid)) continue;
        const customer = customerByUser.get(row.username);
        const voucher = voucherByCode.get(row.username);
        const sessionKind = customer?.kind || voucher?.kind || "ppp";
        if (kind && sessionKind !== kind) continue;
        map.set(row.acctsessionid, {
          sessionId: row.acctsessionid,
          username: row.username,
          name: customer?.name || row.username,
          nasIp: row.nasipaddress || "",
          framedIp: row.framedipaddress || "",
          callingStationId: row.callingstationid || "",
          kind: sessionKind,
          startedAt: asIso(row.acctstarttime),
          sessionTime: Number(row.acctsessiontime) || 0,
          inputOctets: String(row.acctinputoctets ?? 0),
          outputOctets: String(row.acctoutputoctets ?? 0),
        });
      }
    } catch {
      // radacct MySQL opsional
    }
  }

  return [...map.values()];
}

/** Gabung sesi aktif SQLite + radacct FreeRADIUS, unik per session id. */
export async function onlineUsersByNas(nasRows: { id: string; ip: string }[]) {
  const prisma = await getDb();
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

  if (await isFreeradiusConfigured()) {
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
