import { createHash } from "node:crypto";

/**
 * RFC 2865 attribute type codes. Newbill does not run a Node RADIUS server —
 * FreeRADIUS handles Access-Request. This module exists so CoA/Disconnect
 * (RFC 5176) can encode the same attribute IDs into UDP packets.
 */
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

export function md5(data: Buffer) {
  return createHash("md5").update(data).digest();
}
