import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getBillingTenant, maskSecret } from "@/lib/saas";

export const runtime = "nodejs";

/**
 * Setara Mixradius GET /rad-licence/details (+ status layanan).
 * Panel operator membaca lisensi tenant billing yang dikonfigurasi di SaaS.
 */
export async function GET() {
  const tenant = await getBillingTenant();
  if (!tenant) {
    return NextResponse.json(
      { error: "Tenant billing belum dikonfigurasi di SaaS." },
      { status: 404 },
    );
  }

  const [routerUsed, sessionUsed, customerUsed, voucherUsed, radiusSetting] =
    await Promise.all([
      prisma.nas.count({ where: { enabled: true } }),
      prisma.radAcct.count({ where: { stoppedAt: null } }),
      prisma.customer.count(),
      prisma.voucher.count(),
      prisma.appSetting.findUnique({ where: { key: "core_radius_status" } }),
    ]);

  const sessionLimit = tenant.sessionLimit ?? tenant.plan.sessionLimit;
  const radiusRunning = (radiusSetting?.value ?? "running") === "running";

  return NextResponse.json({
    license: {
      tenantId: tenant.id,
      tenantCode: tenant.code,
      tenantName: tenant.name,
      email: tenant.email,
      activatedAt: tenant.activatedAt?.toISOString() ?? tenant.createdAt.toISOString(),
      requestId: tenant.requestId || `NB-${tenant.code.toUpperCase()}`,
      hardwareId: tenant.hardwareId || "XX-XX-XX-XX-XX-XX",
      softwareKey: tenant.softwareKey || `@NEWBILL | ${tenant.code}`,
      expiresAt: tenant.expiresAt?.toISOString() ?? null,
      planName: tenant.plan.name,
      planCode: tenant.plan.code,
    },
    display: {
      requestId: maskSecret(tenant.requestId || `NB-${tenant.code.toUpperCase()}`, 6),
      hardwareId: tenant.hardwareId || "XX-XX-XX-XX-XX-XX",
      softwareKey: maskSecret(
        tenant.softwareKey || `@NEWBILL | ${tenant.code}`,
        10,
      ),
    },
    services: {
      coreRadius: {
        status: radiusRunning ? "running" : "stopped",
        label: radiusRunning ? "Running" : "Stopped",
      },
      mikrotik: {
        used: routerUsed,
        quota: tenant.plan.routerLimit,
        maxLabel: `Max. ${tenant.plan.routerLimit} Mikrotik`,
      },
      session: {
        used: sessionUsed,
        quota: sessionLimit,
        maxLabel: `Max. ${sessionLimit} Session`,
      },
      pelanggan: {
        used: customerUsed,
        quota: tenant.plan.customerLimit,
        maxLabel: `Max. ${tenant.plan.customerLimit} Item`,
      },
      voucher: {
        used: voucherUsed,
        quota: tenant.plan.voucherLimit,
        maxLabel: `Max. ${tenant.plan.voucherLimit} Item`,
      },
    },
  });
}
