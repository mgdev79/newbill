import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomApiUser, randomSecret } from "@/lib/nas-script";
import { publicVpnAccount } from "@/lib/saas";

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

  const vpn = await prisma.vpnAccount.findMany({
    include: { server: true },
    orderBy: { label: "asc" },
  });

  return NextResponse.json({
    apiUser,
    apiPassword,
    radiusSecret,
    radiusAddress: process.env.RADIUS_PUBLIC_IP ?? "",
    radiusAuthPort: Number(process.env.RADIUS_AUTH_PORT ?? 1812),
    radiusAcctPort: Number(process.env.RADIUS_ACCT_PORT ?? 1813),
    radiusIncomingPort: Number(process.env.RADIUS_INCOMING_PORT ?? 3799),
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
