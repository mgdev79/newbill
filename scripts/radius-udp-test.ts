import { createSocket } from "node:dgram";
import { RADIUS_CODE, buildAccessRequest, decodePacket } from "@/server/radius/codec";

const secret = process.env.RADIUS_SECRET ?? "testing123";
const packet = buildAccessRequest({
  username: process.argv[2] ?? "budi.s",
  password: process.argv[3] ?? "radius123",
  secret,
  nasIp: "10.10.10.1",
  callingStationId: "4C:5E:0C:11:22:33",
});

const socket = createSocket("udp4");
const timer = setTimeout(() => {
  console.error("timeout — jalankan npm run radius dulu");
  process.exit(1);
}, 3000);

socket.on("message", (msg) => {
  clearTimeout(timer);
  const decoded = decodePacket(msg);
  const names: Record<number, string> = {
    [RADIUS_CODE.AccessAccept]: "Access-Accept",
    [RADIUS_CODE.AccessReject]: "Access-Reject",
  };
  console.log(names[decoded.code] ?? decoded.code);
  socket.close();
});

socket.send(packet, 1812, "127.0.0.1");
