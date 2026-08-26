import { execFile } from "node:child_process";
import { createSocket } from "node:dgram";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { RADIUS_INCOMING_PORT } from "@/lib/nas-ports";
import { ATTR, md5 } from "@/server/radius/codec";
import { frQuery, isFreeradiusConfigured } from "@/server/freeradius-db";
import type { RowDataPacket } from "mysql2";

const DISCONNECT_REQUEST = 40;

function encodeStringAttr(type: number, value: string) {
  const payload = Buffer.from(value, "utf8");
  const buf = Buffer.alloc(2 + payload.length);
  buf[0] = type;
  buf[1] = buf.length;
  payload.copy(buf, 2);
  return buf;
}

function encodeIpv4Attr(type: number, ip: string) {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  const buf = Buffer.alloc(6);
  buf[0] = type;
  buf[1] = 6;
  Buffer.from(parts).copy(buf, 2);
  return buf;
}

/**
 * RFC 5176 §3: Request Authenticator untuk Disconnect/CoA-Request
 * = MD5(Code + Identifier + Length + 16 zero octets + Attributes + Secret)
 * — pola yang sama dengan Response Authenticator RFC 2865 (`encodeResponse`).
 */
export function buildDisconnectPacket(opts: {
  username: string;
  secret: string;
  nasIp?: string;
  sessionId?: string;
  identifier?: number;
}) {
  const attrs: Buffer[] = [encodeStringAttr(ATTR.UserName, opts.username)];
  if (opts.sessionId) {
    attrs.push(encodeStringAttr(ATTR.AcctSessionId, opts.sessionId));
  }
  if (opts.nasIp) {
    const ip = encodeIpv4Attr(ATTR.NASIPAddress, opts.nasIp);
    if (ip) attrs.push(ip);
  }
  const body = Buffer.concat(attrs);
  const packet = Buffer.alloc(20 + body.length);
  packet[0] = DISCONNECT_REQUEST;
  packet[1] = (opts.identifier ?? randomBytes(1)[0]) & 0xff;
  packet.writeUInt16BE(packet.length, 2);
  body.copy(packet, 20);
  const hash = md5(Buffer.concat([packet, Buffer.from(opts.secret, "utf8")]));
  hash.copy(packet, 4);
  return packet;
}

function nativeDisconnect(opts: {
  username: string;
  nasIp: string;
  secret: string;
  sessionId?: string;
  coaPort: number;
}) {
  const packet = buildDisconnectPacket(opts);
  return new Promise<{ ok: boolean; message: string }>((resolve) => {
    const socket = createSocket("udp4");
    const timer = setTimeout(() => {
      socket.close();
      resolve({ ok: false, message: "timeout menunggu Disconnect-ACK" });
    }, 2500);
    socket.once("error", (error) => {
      clearTimeout(timer);
      socket.close();
      resolve({ ok: false, message: error.message });
    });
    socket.once("message", () => {
      clearTimeout(timer);
      socket.close();
      resolve({ ok: true, message: "Disconnect-ACK/NAK diterima" });
    });
    socket.send(packet, opts.coaPort, opts.nasIp, (error) => {
      if (error) {
        clearTimeout(timer);
        socket.close();
        resolve({ ok: false, message: error.message });
      }
    });
  });
}

function radclientDisconnect(opts: {
  username: string;
  nasIp: string;
  secret: string;
  sessionId?: string;
  coaPort: number;
}) {
  return new Promise<{ ok: boolean; message: string }>((resolve) => {
    const child = execFile(
      "radclient",
      ["-t", "2", `${opts.nasIp}:${opts.coaPort}`, "disconnect", opts.secret],
      { timeout: 5000 },
      (error, stdout, stderr) => {
        if (error) {
          resolve({
            ok: false,
            message: stderr?.trim() || error.message,
          });
          return;
        }
        resolve({ ok: true, message: stdout.trim() || "radclient ok" });
      },
    );
    const lines = [`User-Name = ${opts.username}`];
    if (opts.sessionId) lines.push(`Acct-Session-Id = ${opts.sessionId}`);
    child.stdin?.write(`${lines.join("\n")}\n`);
    child.stdin?.end();
  });
}

type FrAcctRow = RowDataPacket & {
  acctsessionid: string;
  nasipaddress: string;
};

async function liveSessions(username: string) {
  const local = await prisma.radAcct.findMany({
    where: { username, stoppedAt: null },
    select: { sessionId: true, nasIp: true },
  });
  const sessions = local.map((row) => ({
    sessionId: row.sessionId,
    nasIp: row.nasIp,
  }));
  if (!isFreeradiusConfigured()) return sessions;
  try {
    const rows = await frQuery<FrAcctRow[]>(
      "SELECT acctsessionid, nasipaddress FROM radacct WHERE username = ? AND acctstoptime IS NULL",
      [username],
    );
    for (const row of rows) {
      if (!sessions.some((item) => item.sessionId === row.acctsessionid)) {
        sessions.push({ sessionId: row.acctsessionid, nasIp: row.nasipaddress });
      }
    }
  } catch {
    // radacct MySQL opsional; jangan gagalkan CoA
  }
  return sessions;
}

export async function disconnectUser(input: {
  username: string;
  nasIp: string;
  secret: string;
  sessionId?: string;
}) {
  const coaPort = Number(process.env.RADIUS_INCOMING_PORT ?? RADIUS_INCOMING_PORT);
  const sessions = input.sessionId
    ? [{ sessionId: input.sessionId, nasIp: input.nasIp }]
    : await liveSessions(input.username);
  const targets = sessions.length ? sessions : [{ sessionId: "", nasIp: input.nasIp }];
  const results: { ok: boolean; message: string; sessionId: string }[] = [];

  for (const target of targets) {
    const nasIp = target.nasIp || input.nasIp;
    const payload = {
      username: input.username,
      nasIp,
      secret: input.secret,
      sessionId: target.sessionId || undefined,
      coaPort,
    };
    let result = await radclientDisconnect(payload);
    if (!result.ok) {
      result = await nativeDisconnect(payload);
    }
    results.push({ ...result, sessionId: target.sessionId });
    if (target.sessionId) {
      await prisma.radAcct.updateMany({
        where: { sessionId: target.sessionId, stoppedAt: null },
        data: { stoppedAt: new Date() },
      });
    }
  }

  return {
    ok: results.some((item) => item.ok),
    results,
  };
}

export async function disconnectSession(sessionId: string) {
  const row = await prisma.radAcct.findUnique({
    where: { sessionId },
    include: { nas: true, customer: true },
  });
  if (!row) {
    await prisma.radAcct.updateMany({
      where: { sessionId, stoppedAt: null },
      data: { stoppedAt: new Date() },
    });
    return { ok: false, message: "Sesi tidak ditemukan di SQLite." };
  }
  const secret = row.nas?.radiusSecret || process.env.RADIUS_SECRET || "testing123";
  const nasIp = row.nasIp || row.nas?.ip || "";
  if (!nasIp) {
    await prisma.radAcct.updateMany({
      where: { sessionId, stoppedAt: null },
      data: { stoppedAt: new Date() },
    });
    return { ok: false, message: "NAS IP kosong." };
  }
  return disconnectUser({
    username: row.username,
    nasIp,
    secret,
    sessionId,
  });
}
