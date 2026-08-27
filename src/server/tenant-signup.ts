import type { Tenant, TenantSignupOrder } from "@/generated/platform";
import { platformPrisma } from "@/lib/platform-db";
import { tenantPublicOrigin, tenantSubdomain } from "@/lib/tenant-host";
import { provisionTenantDatabase } from "@/server/tenant-provision";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export async function activateTenantSignup(
  order: TenantSignupOrder,
  input: { status: "paid" | "manual_cash"; note: string },
): Promise<{ tenant: Tenant; created: boolean }> {
  const result = await platformPrisma.$transaction(async (tx) => {
    const current = await tx.tenantSignupOrder.findUnique({ where: { id: order.id } });
    if (!current) {
      throw new Error("Order signup tidak ditemukan.");
    }
    if (current.status !== "pending") {
      if (current.activatedTenantId) {
        const existing = await tx.tenant.findUnique({ where: { id: current.activatedTenantId } });
        if (existing) return { tenant: existing, created: false };
      }
      throw new Error("Order ini sudah diproses.");
    }

    const code = tenantSubdomain(current.subdomain);
    const email = current.email.trim().toLowerCase();
    const clash = await tx.tenant.findFirst({
      where: { OR: [{ code }, { email }] },
    });
    if (clash) {
      throw new Error("Subdomain atau email sudah dipakai tenant lain.");
    }

    const now = new Date();
    const tenant = await tx.tenant.create({
      data: {
        code,
        name: current.name.trim(),
        email,
        password: current.password,
        phone: current.phone.trim(),
        planId: current.planId,
        status: "active",
        activatedAt: now,
        expiresAt: new Date(now.getTime() + MONTH_MS),
        billingUrl: tenantPublicOrigin(code),
        notes: `signup ${current.id}`,
      },
    });

    await tx.tenantSignupOrder.update({
      where: { id: current.id },
      data: {
        status: input.status,
        activatedTenantId: tenant.id,
        note: input.note,
      },
    });

    return { tenant, created: true };
  });

  if (result.created) {
    provisionTenantDatabase(result.tenant.code);
  }

  return result;
}

export async function createPlatformTenant(input: {
  code: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  planId: string;
  status?: string;
  billingUrl?: string;
  radiusPublicIp?: string;
  notes?: string;
  expiresAt?: Date | null;
}) {
  const code = tenantSubdomain(input.code);
  const tenant = await platformPrisma.tenant.create({
    data: {
      code,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      phone: input.phone?.trim() ?? "",
      planId: input.planId,
      status: input.status || "active",
      billingUrl: input.billingUrl?.trim() || tenantPublicOrigin(code),
      radiusPublicIp: input.radiusPublicIp?.trim() ?? "",
      notes: input.notes?.trim() ?? "",
      expiresAt: input.expiresAt ?? null,
    },
    include: { plan: true },
  });
  provisionTenantDatabase(code);
  return tenant;
}
