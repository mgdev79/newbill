import { createSocket } from "node:dgram";
import { authorize, accounting } from "@/server/aaa";
import {
  ATTR,
  RADIUS_CODE,
  attrIpv4,
  attrString,
  decodePacket,
  decryptPassword,
  encodeAccountingResponse,
  encodeResponse,
} from "@/server/radius/codec";

const SECRET = process.env.RADIUS_SECRET ?? "testing123";
const AUTH_PORT = Number(process.env.RADIUS_AUTH_PORT ?? 1812);
const ACCT_PORT = Number(process.env.RADIUS_ACCT_PORT ?? 1813);

const ACCT_STATUS: Record<number, "Start" | "Interim-Update" | "Stop"> = {
  1: "Start",
  2: "Stop",
  3: "Interim-Update",
};

async function handleAuth(msg: Buffer, rinfo: { address: string; port: number }, socket: ReturnType<typeof createSocket>) {
  const packet = decodePacket(msg);
  if (packet.code !== RADIUS_CODE.AccessRequest) return;
  const username = attrString(packet, ATTR.UserName);
  const encrypted = packet.attributes.find((item) => item.type === ATTR.UserPassword)?.value;
  const password = encrypted
    ? decryptPassword(SECRET, packet.authenticator, encrypted)
    : undefined;
  const result = await authorize({
    username,
    password,
    nasIp: attrIpv4(packet, ATTR.NASIPAddress) || rinfo.address,
    callingStationId: attrString(packet, ATTR.CallingStationId),
    calledStationId: attrString(packet, ATTR.CalledStationId),
  });
  const reply = encodeResponse(
    packet,
    result.accept ? RADIUS_CODE.AccessAccept : RADIUS_CODE.AccessReject,
    SECRET,
    result.accept ? result.reply : {},
  );
  socket.send(reply, rinfo.port, rinfo.address);
}

async function handleAcct(msg: Buffer, rinfo: { address: string; port: number }, socket: ReturnType<typeof createSocket>) {
  const packet = decodePacket(msg);
  if (packet.code !== RADIUS_CODE.AccountingRequest) return;
  const statusRaw = packet.attributes.find((item) => item.type === ATTR.AcctStatusType);
  const statusCode = statusRaw ? statusRaw.value.readUInt32BE(0) : 1;
  const statusType = ACCT_STATUS[statusCode] ?? "Interim-Update";
  await accounting({
    statusType,
    sessionId: attrString(packet, ATTR.AcctSessionId) || `${Date.now()}`,
    username: attrString(packet, ATTR.UserName),
    nasIp: attrIpv4(packet, ATTR.NASIPAddress) || rinfo.address,
    framedIp: attrIpv4(packet, ATTR.FramedIPAddress),
    callingStationId: attrString(packet, ATTR.CallingStationId),
  });
  socket.send(encodeAccountingResponse(packet, SECRET), rinfo.port, rinfo.address);
}

export function startRadiusServer() {
  const auth = createSocket("udp4");
  const acct = createSocket("udp4");
  auth.on("message", (msg, rinfo) => {
    void handleAuth(msg, rinfo, auth);
  });
  acct.on("message", (msg, rinfo) => {
    void handleAcct(msg, rinfo, acct);
  });
  auth.bind(AUTH_PORT, () => {
    console.log(`RADIUS auth UDP ${AUTH_PORT}`);
  });
  acct.bind(ACCT_PORT, () => {
    console.log(`RADIUS acct UDP ${ACCT_PORT}`);
  });
  return { auth, acct };
}
