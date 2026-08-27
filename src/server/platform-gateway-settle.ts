import { prisma } from "@/lib/db";
import { activateTenantSignup } from "@/server/tenant-signup";

/** Settlement khusus signup tenant. Jangan campur dengan settleGatewayPayment (invoice/e-voucher ISP). */
export async function settlePlatformGatewayPayment(input: {
  ref: string;
  paid: boolean;
  channel?: string;
  note: string;
}) {
  const order = await prisma.tenantSignupOrder.findUnique({ where: { id: input.ref } });
  if (!order) {
    return { paid: input.paid, status: "ignored" as const };
  }
  if (!input.paid) {
    if (order.status === "pending") {
      await prisma.tenantSignupOrder.update({
        where: { id: order.id },
        data: { status: "failed", note: input.note },
      });
    }
    return { paid: false, status: "failed" as const };
  }
  if (order.status !== "pending") {
    return { paid: true, status: order.status };
  }
  try {
    const result = await activateTenantSignup(order, {
      status: "paid",
      note: input.note,
    });
    if (input.channel) {
      await prisma.tenantSignupOrder.update({
        where: { id: order.id },
        data: { paymentChannel: input.channel || order.paymentChannel },
      });
    }
    return { paid: true, status: "paid" as const, tenantId: result.tenant.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.tenantSignupOrder
      .update({
        where: { id: order.id },
        data: { note: `${input.note} · aktivasi gagal: ${message}` },
      })
      .catch(() => null);
    return { paid: true, status: "error" as const, error: message };
  }
}
