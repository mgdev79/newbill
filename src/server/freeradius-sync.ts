import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Nas } from "@prisma/client";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { acctPortFor, nextAuthPort, RADIUS_INCOMING_PORT } from "@/lib/nas-ports";
import {
  customerRadiusPolicy,
  replyEntries,
  voucherRadiusPolicy,
  type CustomerPolicyInput,
  type VoucherPolicyInput,
} from "@/server/radius-policy";
import { frExecute, frQuery, isFreeradiusConfigured } from "@/server/freeradius-db";
import { disconnectUser } from "@/server/radius-coa";

const execFileAsync = promisify(execFile);

export type NasRadiusPorts = {
  mysqlId: number;
  nasname: string;
  shortname: string;
  secret: string;
  radiusAuthPort: number;
  radiusAcctPort: number;
  provisioned: boolean;
  provisionError?: string;
};

type NasMysqlRow = RowDataPacket & {
  id: number;
  nasname: string;
  shortname: string;
  secret: string;
  radius_auth_port: number | null;
  radius_acct_port: number | null;
};

function logSkip(action: string) {
  console.warn(`[freeradius] skip ${action}: FREERADIUS_DB_URL tidak ada`);
}

export async function removeRadiusUsername(username: string) {
  if (!username) return;
  if (!isFreeradiusConfigured()) {
    logSkip(`remove ${username}`);
    return;
  }
  await frExecute("DELETE FROM radcheck WHERE username = ?", [username]);
  await frExecute("DELETE FROM radreply WHERE username = ?", [username]);
}

async function writeRadiusUser(
  username: string,
  password: string,
  reply: Record<string, string | undefined>,
) {
  await removeRadiusUsername(username);
  await frExecute(
    "INSERT INTO radcheck (username, attribute, op, value) VALUES (?, 'Cleartext-Password', ':=', ?)",
    [username, password],
  );
  for (const [attribute, value] of replyEntries(reply)) {
    await frExecute(
      "INSERT INTO radreply (username, attribute, op, value) VALUES (?, ?, ':=', ?)",
      [username, attribute, value],
    );
  }
}

export async function syncCustomerRadius(customer: CustomerPolicyInput) {
  if (!isFreeradiusConfigured()) {
    logSkip(`customer ${customer.username}`);
    return { skipped: true as const };
  }
  const policy = customerRadiusPolicy(customer);
  if (!policy.allow) {
    await removeRadiusUsername(policy.username);
    return { skipped: false as const, allow: false as const, reason: policy.reason };
  }
  await writeRadiusUser(policy.username, policy.password, policy.reply);
  return {
    skipped: false as const,
    allow: true as const,
    isolated: policy.isolated,
    reply: policy.reply,
  };
}

export async function syncVoucherRadius(voucher: VoucherPolicyInput) {
  if (!isFreeradiusConfigured()) {
    logSkip(`voucher ${voucher.code}`);
    return { skipped: true as const };
  }
  const policy = voucherRadiusPolicy(voucher);
  if (!policy.allow) {
    await removeRadiusUsername(policy.username);
    return { skipped: false as const, allow: false as const, reason: policy.reason };
  }
  await writeRadiusUser(policy.username, policy.password, policy.reply);
  return { skipped: false as const, allow: true as const, reply: policy.reply };
}

async function usedAuthPorts() {
  const rows = await frQuery<NasMysqlRow[]>(
    "SELECT id, nasname, shortname, secret, radius_auth_port, radius_acct_port FROM nas",
  );
  return rows;
}

async function findNasMysql(nas: Pick<Nas, "name" | "ip">) {
  const byName = await frQuery<NasMysqlRow[]>(
    "SELECT id, nasname, shortname, secret, radius_auth_port, radius_acct_port FROM nas WHERE shortname = ? LIMIT 1",
    [nas.name],
  );
  if (byName[0]) return byName[0];
  const byIp = await frQuery<NasMysqlRow[]>(
    "SELECT id, nasname, shortname, secret, radius_auth_port, radius_acct_port FROM nas WHERE nasname = ? LIMIT 1",
    [nas.ip],
  );
  return byIp[0] ?? null;
}

export async function provisionNasListener(mysqlId: number) {
  const script =
    process.env.FREERADIUS_PROVISION_SCRIPT?.trim() ||
    "/opt/radius-provision/gen_nas_listener.sh";
  const useSudo = process.env.FREERADIUS_PROVISION_SUDO !== "0";
  const timeout = Number(process.env.FREERADIUS_PROVISION_TIMEOUT_MS ?? 60_000);
  const file = useSudo ? "sudo" : script;
  const args = useSudo ? [script, String(mysqlId)] : [String(mysqlId)];
  await execFileAsync(file, args, { timeout });
}

export async function syncNasRadius(
  nas: Nas,
  previous?: Pick<Nas, "name" | "ip">,
): Promise<NasRadiusPorts | { skipped: true }> {
  if (!isFreeradiusConfigured()) {
    logSkip(`nas ${nas.name}`);
    return { skipped: true };
  }

  let row = await findNasMysql(previous ?? nas);
  if (!row && previous) {
    row = await findNasMysql(nas);
  }
  if (!row) {
    const insert = await frExecute(
      `INSERT INTO nas
        (nasname, shortname, type, ports, secret, server, community, description,
         mikrotik_api_port, mikrotik_api_user, mikrotik_api_pass)
       VALUES (?, ?, 'other', NULL, ?, '', '', ?, ?, ?, ?)`,
      [
        nas.ip,
        nas.name,
        nas.radiusSecret,
        nas.description ?? "",
        nas.apiPort,
        nas.apiUser,
        nas.apiPassword ?? "",
      ],
    );
    const header = insert as ResultSetHeader;
    row = {
      id: header.insertId,
      nasname: nas.ip,
      shortname: nas.name,
      secret: nas.radiusSecret,
      radius_auth_port: null,
      radius_acct_port: null,
    } as NasMysqlRow;
  }

  let authPort = Number(row.radius_auth_port) || 0;
  let allocated = false;
  if (!authPort) {
    const existing = await usedAuthPorts();
    authPort = nextAuthPort(existing.map((item) => item.radius_auth_port));
    allocated = true;
  }
  const acctPort = Number(row.radius_acct_port) || acctPortFor(authPort);

  await frExecute(
    `UPDATE nas SET
      nasname = ?, shortname = ?, secret = ?, description = ?,
      mikrotik_api_port = ?, mikrotik_api_user = ?, mikrotik_api_pass = ?,
      radius_auth_port = ?, radius_acct_port = ?
     WHERE id = ?`,
    [
      nas.ip,
      nas.name,
      nas.radiusSecret,
      nas.description ?? "",
      nas.apiPort,
      nas.apiUser,
      nas.apiPassword ?? "",
      authPort,
      acctPort,
      row.id,
    ],
  );

  let provisionError: string | undefined;
  let provisioned = false;
  const identityChanged = Boolean(
    previous && (previous.ip !== nas.ip || previous.name !== nas.name),
  );
  const secretChanged = Boolean(row.secret && row.secret !== nas.radiusSecret);
  if (
    allocated ||
    identityChanged ||
    secretChanged ||
    process.env.FREERADIUS_PROVISION_ALWAYS === "1"
  ) {
    try {
      await provisionNasListener(row.id);
      provisioned = true;
    } catch (error) {
      provisionError = error instanceof Error ? error.message : String(error);
      console.error(`[freeradius] provision NAS ${row.id} gagal:`, provisionError);
    }
  }

  return {
    mysqlId: row.id,
    nasname: nas.ip,
    shortname: nas.name,
    secret: nas.radiusSecret,
    radiusAuthPort: authPort,
    radiusAcctPort: acctPort,
    provisioned,
    provisionError,
  };
}

export async function removeNasRadius(nas: Pick<Nas, "name" | "ip">) {
  if (!isFreeradiusConfigured()) {
    logSkip(`remove nas ${nas.name}`);
    return { skipped: true as const };
  }
  const row = await findNasMysql(nas);
  if (!row) return { skipped: false as const, deleted: false as const };
  await frExecute("DELETE FROM nas WHERE id = ?", [row.id]);

  const remaining = await frQuery<NasMysqlRow[]>(
    "SELECT id, nasname, shortname, secret, radius_auth_port, radius_acct_port FROM nas LIMIT 1",
  );
  if (remaining[0]) {
    try {
      await provisionNasListener(remaining[0].id);
    } catch (error) {
      console.error(
        "[freeradius] refresh listener setelah hapus NAS gagal:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  return { skipped: false as const, deleted: true as const };
}

export async function listNasRadiusPorts() {
  if (!isFreeradiusConfigured()) return [];
  const rows = await usedAuthPorts();
  return rows.map((row) => ({
    mysqlId: row.id,
    nasname: row.nasname,
    shortname: row.shortname,
    secret: row.secret,
    radiusAuthPort: Number(row.radius_auth_port) || 0,
    radiusAcctPort: Number(row.radius_acct_port) || 0,
  }));
}

export function incomingPort() {
  return Number(process.env.RADIUS_INCOMING_PORT ?? RADIUS_INCOMING_PORT);
}

export async function disconnectCustomerSessions(input: {
  username: string;
  nasIp: string;
  secret: string;
}) {
  return disconnectUser({
    username: input.username,
    nasIp: input.nasIp,
    secret: input.secret,
  });
}
