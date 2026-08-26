import { prisma } from "@/lib/db";
import { syncCustomerById } from "@/server/radius-hooks";

export type GatewayProvider = "duitku" | "xendit" | "midtrans" | "nicepay";

export async function getActiveGatewayProvider(): Promise<GatewayProvider> {
  const row = await prisma.appSetting.findUnique({ where: { key: "gateway.provider" } });
  const value = row?.value ?? "duitku";
  if (value === "xendit" || value === "midtrans" || value === "nicepay" || value === "duitku") {
    return value;
  }
  return "duitku";
}

export async function settleGatewayPayment(input: {
  ref: string;
  paid: boolean;
  channel?: string;
  note: string;
  method: string;
}) {
  const status = input.paid ? "paid" : "failed";
  const txn = await prisma.paymentTxn.findUnique({ where: { ref: input.ref } });
  if (txn) {
    await prisma.paymentTxn.update({
      where: { id: txn.id },
      data: {
        status,
        channel: input.channel || txn.channel,
        note: input.note,
      },
    });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { number: input.ref },
    include: { customer: true },
  });
  if (invoice && input.paid && invoice.status !== "paid") {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "paid", method: input.method, paidAt: invoice.paidAt ?? new Date() },
    });
    if (invoice.customer.status === "isolated") {
      await prisma.customer.update({
        where: { id: invoice.customerId },
        data: { status: "active", trxStatus: "paid", renewedAt: new Date() },
      });
    }
    await syncCustomerById(invoice.customerId);
  }

  const order = await prisma.evoucherOrder.findUnique({ where: { id: input.ref } });
  if (order) {
    await prisma.evoucherOrder.update({
      where: { id: order.id },
      data: { status: input.paid ? "paid" : "failed", note: input.note },
    });
  }

  return { paid: input.paid, status };
}
