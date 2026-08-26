import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractIpv4, randomApiUser, randomSecret } from "@/lib/nas-script";
import { publicVpnAccount } from "@/lib/saas";
import { nasPortsIndex, radiusIncomingPort } from "@/server/nas-radius-view";
import { getRadiusPublicIp } from "@/server/radius-engine";

export const runtime = "nodejs";

async function getSetting(key: string, fallback: string) {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

async function putSetting(key: string, value: string) {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function GET() {
  let apiUser = await getSetting("nasApiUser", "");
  let apiPassword = await getSetting("nasApiPassword", "");
  let radiusSecret = await getSetting("radiusSecret", process.env.RADIUS_SECRET ?? "testing123");
  if (!apiUser || !apiPassword) {
    apiUser = randomApiUser();
    apiPassword = radiusSecret;
    await putSetting("nasApiUser", apiUser);
    await putSetting("nasApiPassword", apiPassword);
  }
  await putSetting("radiusSecret", radiusSecret);

  const [vpn, nasRows, index, incoming, radiusAddress] = await Promise.all([
    prisma.vpnAccount.findMany({
      include: { server: true },
      orderBy: { label: "asc" },
    }),
    prisma.nas.findMany({ orderBy: { name: "asc" } }),
    nasPortsIndex(),
    radiusIncomingPort(),
    getRadiusPublicIp(),
  ]);

  return NextResponse.json({
    apiUser,
    apiPassword,
    radiusSecret,
    radiusAddress,
    radiusIncomingPort: incoming,
    nasListeners: nasRows.map((nas) => {
      const ports = index.byName.get(nas.name) ?? index.byIp.get(nas.ip);
      return {
        id: nas.id,
        name: nas.name,
        ip: nas.ip,
        radiusSecret: nas.radiusSecret,
        radiusAuthPort: ports?.radiusAuthPort || 0,
        radiusAcctPort: ports?.radiusAcctPort || 0,
        radiusIncomingPort: incoming,
        enablePpp: nas.enablePpp,
        enableHotspot: nas.enableHotspot,
        apiUser: nas.apiUser || apiUser,
        apiPassword: nas.apiPassword || apiPassword,
      };
    }),
    vpnAccounts: vpn.map((row) => {
      const pub = publicVpnAccount(row);
      return {
        id: pub.id,
        label: pub.label,
        username: pub.username,
        password: pub.password,
        serverHost: pub.serverHost,
        type: pub.type,
        innerRadiusIp: pub.innerRadiusIp,
        assignedIp: extractIpv4(pub.note),
        note: pub.online ? "online" : "offline",
      };
    }),
  });
}

export async function POST() {
  const apiUser = randomApiUser();
  const shared = randomSecret(16);
  await putSetting("nasApiUser", apiUser);
  await putSetting("nasApiPassword", shared);
  await putSetting("radiusSecret", shared);
  return NextResponse.json({ apiUser, apiPassword: shared, radiusSecret: shared });
}
