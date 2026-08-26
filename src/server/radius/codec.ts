import { createHash, randomBytes } from "node:crypto";

export const RADIUS_CODE = {
  AccessRequest: 1,
  AccessAccept: 2,
  AccessReject: 3,
  AccountingRequest: 4,
  AccountingResponse: 5,
} as const;

export const ATTR = {
  UserName: 1,
  UserPassword: 2,
  NASIPAddress: 4,
  FramedIPAddress: 8,
  VendorSpecific: 26,
  CalledStationId: 30,
  CallingStationId: 31,
  AcctStatusType: 40,
  AcctInputOctets: 42,
  AcctOutputOctets: 43,
  AcctSessionId: 44,
  AcctSessionTime: 46,
  SessionTimeout: 27,
} as const;

export const MIKROTIK_VENDOR = 14988;
export const MIKROTIK_RATE_LIMIT = 8;
export const MIKROTIK_GROUP = 3;

export type RadiusPacket = {
  code: number;
  identifier: number;
  authenticator: Buffer;
  attributes: { type: number; value: Buffer; vendor?: number; vendorType?: number }[];
};

export function md5(data: Buffer) {
  return createHash("md5").update(data).digest();
}

export function decodePacket(buf: Buffer): RadiusPacket {
  const code = buf[0];
  const identifier = buf[1];
  const length = buf.readUInt16BE(2);
  const authenticator = buf.subarray(4, 20);
  const attributes: RadiusPacket["attributes"] = [];
  let offset = 20;
  while (offset < length) {
    const type = buf[offset];
    const size = buf[offset + 1];
    const value = buf.subarray(offset + 2, offset + size);
    if (type === ATTR.VendorSpecific && value.length >= 6) {
      const vendor = value.readUInt32BE(0);
      const vendorType = value[4];
      const vendorLen = value[5];
      const vendorValue = value.subarray(6, 4 + vendorLen);
      attributes.push({ type, value: vendorValue, vendor, vendorType });
    } else {
      attributes.push({ type, value });
    }
    offset += size;
  }
  return { code, identifier, authenticator, attributes };
}

export function attrString(packet: RadiusPacket, type: number) {
  const found = packet.attributes.find((item) => item.type === type);
  return found ? found.value.toString("utf8").replace(/\0+$/, "") : "";
}

export function attrIpv4(packet: RadiusPacket, type: number) {
  const found = packet.attributes.find((item) => item.type === type && item.value.length === 4);
  if (!found) return "";
  return Array.from(found.value).join(".");
}

export function decryptPassword(secret: string, authenticator: Buffer, encrypted: Buffer) {
  const secretBuf = Buffer.from(secret, "utf8");
  const blocks = Math.ceil(encrypted.length / 16);
  const out = Buffer.alloc(blocks * 16);
  let last = authenticator;
  for (let i = 0; i < blocks; i += 1) {
    const hash = md5(Buffer.concat([secretBuf, last]));
    const block = encrypted.subarray(i * 16, i * 16 + 16);
    for (let j = 0; j < 16; j += 1) {
      out[i * 16 + j] = block[j] ^ hash[j];
    }
    last = block;
  }
  const nullAt = out.indexOf(0);
  return out.subarray(0, nullAt === -1 ? out.length : nullAt).toString("utf8");
}

function encodeAttribute(type: number, value: Buffer) {
  const buf = Buffer.alloc(2 + value.length);
  buf[0] = type;
  buf[1] = buf.length;
  value.copy(buf, 2);
  return buf;
}

function encodeVendor(vendorType: number, value: Buffer) {
  const inner = Buffer.alloc(6 + value.length);
  inner.writeUInt32BE(MIKROTIK_VENDOR, 0);
  inner[4] = vendorType;
  inner[5] = 2 + value.length;
  value.copy(inner, 6);
  return encodeAttribute(ATTR.VendorSpecific, inner);
}

function ipv4Buf(ip: string) {
  const parts = ip.split(".").map((part) => Number(part));
  return Buffer.from(parts);
}

export function encodeResponse(
  request: RadiusPacket,
  code: number,
  secret: string,
  reply: Record<string, string>,
) {
  const attrs: Buffer[] = [];
  for (const [key, value] of Object.entries(reply)) {
    if (!value) continue;
    if (key === "Mikrotik-Rate-Limit") {
      attrs.push(encodeVendor(MIKROTIK_RATE_LIMIT, Buffer.from(value)));
    } else if (key === "Mikrotik-Group") {
      attrs.push(encodeVendor(MIKROTIK_GROUP, Buffer.from(value)));
    } else if (key === "Framed-IP-Address") {
      attrs.push(encodeAttribute(ATTR.FramedIPAddress, ipv4Buf(value)));
    } else if (key === "Framed-Pool") {
      attrs.push(encodeAttribute(88, Buffer.from(value)));
    } else if (key === "Session-Timeout") {
      const n = Buffer.alloc(4);
      n.writeUInt32BE(Number(value));
      attrs.push(encodeAttribute(ATTR.SessionTimeout, n));
    }
  }

  const attrBody = Buffer.concat(attrs);
  const length = 20 + attrBody.length;
  const header = Buffer.alloc(20);
  header[0] = code;
  header[1] = request.identifier;
  header.writeUInt16BE(length, 2);
  request.authenticator.copy(header, 4);

  const packet = Buffer.concat([header, attrBody]);
  const hash = md5(Buffer.concat([packet, Buffer.from(secret, "utf8")]));
  hash.copy(packet, 4);
  return packet;
}

export function encodeAccountingResponse(request: RadiusPacket, secret: string) {
  return encodeResponse(request, RADIUS_CODE.AccountingResponse, secret, {});
}

export function buildAccessRequest(opts: {
  username: string;
  password: string;
  secret: string;
  nasIp?: string;
  callingStationId?: string;
}) {
  const identifier = randomBytes(1)[0];
  const authenticator = randomBytes(16);
  const secretBuf = Buffer.from(opts.secret, "utf8");
  const pwd = Buffer.concat([Buffer.from(opts.password, "utf8"), Buffer.alloc(16)]).subarray(0, 16);
  const hash = md5(Buffer.concat([secretBuf, authenticator]));
  const encrypted = Buffer.alloc(16);
  for (let i = 0; i < 16; i += 1) encrypted[i] = pwd[i] ^ hash[i];

  const attrs = [
    encodeAttribute(ATTR.UserName, Buffer.from(opts.username)),
    encodeAttribute(ATTR.UserPassword, encrypted),
  ];
  if (opts.nasIp) attrs.push(encodeAttribute(ATTR.NASIPAddress, ipv4Buf(opts.nasIp)));
  if (opts.callingStationId) {
    attrs.push(encodeAttribute(ATTR.CallingStationId, Buffer.from(opts.callingStationId)));
  }
  const body = Buffer.concat(attrs);
  const packet = Buffer.alloc(20 + body.length);
  packet[0] = RADIUS_CODE.AccessRequest;
  packet[1] = identifier;
  packet.writeUInt16BE(packet.length, 2);
  authenticator.copy(packet, 4);
  body.copy(packet, 20);
  return packet;
}
