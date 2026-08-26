import { duitkuInquiry } from "@/server/duitku";
import type { GatewayProvider } from "@/server/gateway-settle";
import { midtransCreateSnap } from "@/server/midtrans";
import { nicepayRegister } from "@/server/nicepay";
import { xenditCreateInvoice } from "@/server/xendit";

export type GatewayChargeResult =
  | { ok: true; paymentUrl: string; reference: string; vaNumber?: string; qrString?: string }
  | { ok: false; error: string };

export async function createGatewayCharge(input: {
  provider: GatewayProvider;
  ref: string;
  amount: number;
  channel: string;
  description: string;
  customer?: string;
  email?: string;
  phone?: string;
}): Promise<GatewayChargeResult> {
  if (input.provider === "xendit") {
    const result = await xenditCreateInvoice({
      externalId: input.ref,
      amount: input.amount,
      description: input.description,
      email: input.email,
    });
    if (!result.ok) return result;
    return { ok: true, paymentUrl: result.paymentUrl, reference: result.reference };
  }
  if (input.provider === "midtrans") {
    const result = await midtransCreateSnap({
      orderId: input.ref,
      amount: input.amount,
      customer: input.customer,
      email: input.email,
    });
    if (!result.ok) return result;
    return { ok: true, paymentUrl: result.paymentUrl, reference: result.reference };
  }
  if (input.provider === "nicepay") {
    const result = await nicepayRegister({
      referenceNo: input.ref,
      amount: input.amount,
      description: input.description,
      customer: input.customer,
      email: input.email,
      phone: input.phone,
      channel: input.channel,
    });
    if (!result.ok) return result;
    return {
      ok: true,
      paymentUrl: result.paymentUrl,
      reference: result.reference,
      vaNumber: result.vaNumber,
    };
  }
  const result = await duitkuInquiry({
    merchantOrderId: input.ref,
    paymentAmount: input.amount,
    paymentMethod: input.channel || "SP",
    productDetails: input.description,
    email: input.email,
    phoneNumber: input.phone,
    customerVaName: input.customer || input.ref,
  });
  if (!result.ok) return result;
  return {
    ok: true,
    paymentUrl: result.paymentUrl,
    reference: result.reference,
    vaNumber: result.vaNumber,
    qrString: result.qrString,
  };
}
