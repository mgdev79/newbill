import type { Tenant, TenantSignupOrder } from "@prisma/client";
import { prisma } from "@/lib/db";
import { tenantPublicOrigin, tenantSubdomain } from "@/lib/tenant-host";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Satu jalur aktivasi untuk callback gateway platform dan tombol "Tandai Bayar Tunai".
 * Isolasi DB per-tenant belum ada di codebase ini — yang dibuat adalah baris Tenant
 * di database platform yang sama (pola POST /api/v1/saas/tenants).
 */
export async function activateTenantSignup(
  order: TenantSignupOrder,
  input: { status: "paid" | "manual_cash"; note: string },
): Promise<{ tenant: Tenant; created: boolean }> {
  return prisma.$transaction(async (tx) => {
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
}
