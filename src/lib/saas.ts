import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { TENANT_COOKIE } from "@/lib/auth-cookies";

export { TENANT_COOKIE };
export const BILLING_TENANT_SETTING = "billing_tenant_code";

export async function getTenantSession() {
  const jar = await cookies();
  const id = jar.get(TENANT_COOKIE)?.value;
  if (!id) return null;
  return prisma.tenant.findUnique({
    where: { id },
    include: { plan: true },
  });
}

/** Tenant yang lisensinya ditampilkan di panel operator billing. */
export async function getBillingTenant() {
  const setting = await prisma.appSetting.findUnique({
    where: { key: BILLING_TENANT_SETTING },
  });
  const code = setting?.value || "ariyana";
  return prisma.tenant.findUnique({
    where: { code },
    include: { plan: true },
  });
}

type PlanShape = {
  id: string;
  name: string;
  code: string;
  vpnQuota: number;
  routerLimit: number;
  customerLimit: number;
  voucherLimit: number;
  sessionLimit: number;
  priceMonth: number;
};

export function publicTenant(row: {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  billingUrl: string;
  radiusPublicIp: string;
  notes: string;
  expiresAt: Date | null;
  activatedAt: Date | null;
  requestId: string;
  hardwareId: string;
  softwareKey: string;
  sessionLimit: number | null;
  createdAt: Date;
  plan: PlanShape;
}) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    billingUrl: row.billingUrl,
    radiusPublicIp: row.radiusPublicIp,
    notes: row.notes,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    activatedAt: row.activatedAt?.toISOString() ?? null,
    requestId: row.requestId,
    hardwareId: row.hardwareId,
    softwareKey: row.softwareKey,
    sessionLimit: row.sessionLimit,
    createdAt: row.createdAt.toISOString(),
    plan: row.plan,
  };
}

export function publicVpnAccount(row: {
  id: string;
  label: string;
  username: string;
  password: string;
  type: string;
  innerRadiusIp: string;
  note: string;
  enabled: boolean;
  serverHost: string;
  tenantId: string | null;
  serverId: string | null;
  server?: { host: string; name: string; region: string; online: boolean; innerRadiusIp: string } | null;
}) {
  const host = row.server?.host || row.serverHost;
  const inner = row.innerRadiusIp || row.server?.innerRadiusIp || "";
  return {
    id: row.id,
    label: row.label,
    username: row.username,
    password: row.password,
    type: row.type,
    innerRadiusIp: inner,
    note: row.note,
    enabled: row.enabled,
    serverHost: host,
    serverName: row.server?.name ?? host,
    region: row.server?.region ?? "",
    online: row.server?.online ?? true,
    tenantId: row.tenantId,
    serverId: row.serverId,
  };
}

export function publicVpnServer(
  row: {
    id: string;
    name: string;
    host: string;
    region: string;
    online: boolean;
    innerRadiusIp: string;
    note: string;
    apiPort: number;
    useSsl: boolean;
    timeoutSec: number;
    apiUser: string;
    apiPassword: string;
    lastSeenAt: Date | null;
    lastError: string;
  },
  accountCount = 0,
) {
  return {
    id: row.id,
    name: row.name,
    host: row.host,
    region: row.region,
    online: row.online,
    innerRadiusIp: row.innerRadiusIp,
    note: row.note,
    apiPort: row.apiPort,
    useSsl: row.useSsl,
    timeoutSec: row.timeoutSec,
    apiUser: row.apiUser,
    hasApiPassword: Boolean(row.apiPassword),
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    lastError: row.lastError,
    accountCount,
  };
}

export function maskSecret(value: string, visible = 8) {
  if (!value) return "—";
  if (value.length <= visible) return `${value[0] ?? ""}••••`;
  return `${value.slice(0, visible)}${".".repeat(Math.min(40, value.length - visible))}`;
}
