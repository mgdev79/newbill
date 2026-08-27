import { NextResponse } from "next/server";
import { getDb, getRequestTenant } from "@/lib/db";
import { platformPrisma } from "@/lib/platform-db";
import { extractIpv4, randomApiUser, randomSecret } from "@/lib/nas-script";
import { publicVpnAccount } from "@/lib/saas";
import { nasPortsIndex, radiusIncomingPort } from "@/server/nas-radius-view";
import { getRadiusPublicIp } from "@/server/radius-engine";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

async function getSetting(prisma: Awaited<ReturnType<typeof getDb>>, key: string, fallback: string) {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

async function putSetting(prisma: Awaited<ReturnType<typeof getDb>>, key: string, value: string) {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export const GET = withApiErrorHandling(async function GET() {
  const prisma = await getDb();
  const tenant = await getRequestTenant();
  let apiUser = await getSetting(prisma, "nasApiUser", "");
  let apiPassword = await getSetting(prisma, "nasApiPassword", "");
  const radiusSecret = await getSetting(
    prisma,
    "radiusSecret",
    process.env.RADIUS_SECRET ?? "testing123",
  );
  if (!apiUser || !apiPassword) {
    apiUser = randomApiUser();
    apiPassword = radiusSecret;
    await putSetting(prisma, "nasApiUser", apiUser);
    await putSetting(prisma, "nasApiPassword", apiPassword);
  }
  await putSetting(prisma, "radiusSecret", radiusSecret);

  const vpnPromise = tenant
    ? platformPrisma.vpnAccount.findMany({
        where: { tenantId: tenant.id },
        include: { server: true },
        orderBy: { label: "asc" },
      })
    : Promise.resolve([]);

  const [vpn, nasRows, index, incoming, radiusAddress] = await Promise.all([
    vpnPromise,
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
});

export const POST = withApiErrorHandling(async function POST() {
  const prisma = await getDb();
  const apiUser = randomApiUser();
  const shared = randomSecret(16);
  await putSetting(prisma, "nasApiUser", apiUser);
  await putSetting(prisma, "nasApiPassword", shared);
  await putSetting(prisma, "radiusSecret", shared);
  return NextResponse.json({ apiUser, apiPassword: shared, radiusSecret: shared });
});
