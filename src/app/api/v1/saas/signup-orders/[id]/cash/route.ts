import { NextResponse } from "next/server";
import { platformPrisma as prisma } from "@/lib/platform-db";
import { activateTenantSignup } from "@/server/tenant-signup";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const order = await prisma.tenantSignupOrder.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  if (order.status !== "pending") {
    return NextResponse.json(
      { error: "Order sudah diproses.", status: order.status, tenantId: order.activatedTenantId || undefined },
      { status: 409 },
    );
  }
  try {
    const result = await activateTenantSignup(order, {
      status: "manual_cash",
      note: `manual_cash · ${new Date().toISOString()} · saas-admin`,
    });
    return NextResponse.json({
      row: {
        id: order.id,
        status: "manual_cash",
        activatedTenantId: result.tenant.id,
        created: result.created,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal aktivasi tunai." },
      { status: 409 },
    );
  }
}
