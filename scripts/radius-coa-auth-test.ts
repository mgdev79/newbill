import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildDisconnectPacket } from "@/server/radius-coa";

function md5(data: Buffer) {
  return createHash("md5").update(data).digest();
}

const secret = "testing123";
const packet = buildDisconnectPacket({
  username: "budi.s",
  secret,
  nasIp: "10.10.10.1",
  sessionId: "abc-session",
  identifier: 42,
});

assert.equal(packet[0], 40, "code Disconnect-Request");
assert.equal(packet[1], 42, "identifier");
assert.equal(packet.readUInt16BE(2), packet.length, "length");

const withZeroAuth = Buffer.from(packet);
withZeroAuth.fill(0, 4, 20);
const expected = md5(Buffer.concat([withZeroAuth, Buffer.from(secret, "utf8")]));
assert.deepEqual(
  [...packet.subarray(4, 20)],
  [...expected],
  "Request Authenticator harus MD5(code+id+len+16-zero+attrs+secret)",
);

const wrongSecret = md5(Buffer.concat([withZeroAuth, Buffer.from("wrong-secret", "utf8")]));
assert.notDeepEqual(
  [...packet.subarray(4, 20)],
  [...wrongSecret],
  "secret yang berbeda harus menghasilkan Authenticator berbeda",
);

assert.notDeepEqual(
  [...packet.subarray(4, 20)],
  Array.from({ length: 16 }, () => 0),
  "Authenticator tidak boleh 16 octet nol",
);

console.log("radius-coa RFC 5176 Request Authenticator: ok");
