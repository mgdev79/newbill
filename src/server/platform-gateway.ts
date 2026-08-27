import type { GatewayProvider } from "@/server/gateway-settle";
import { platformDuitkuInquiry } from "@/server/platform-duitku";
import { platformMidtransCreateSnap } from "@/server/platform-midtrans";
import { platformNicepayRegister } from "@/server/platform-nicepay";
import { platformXenditCreateInvoice } from "@/server/platform-xendit";

export {
  getActivePlatformGatewayProvider,
  getPlatformGatewaySetting,
  publicPlatformGatewaySetting,
} from "@/server/platform-gateway-settings";
export { settlePlatformGatewayPayment } from "@/server/platform-gateway-settle";

export async function createPlatformGatewayCharge(input: {
  provider: GatewayProvider;
  ref: string;
  amount: number;
  channel: string;
  description: string;
  customer?: string;
  email?: string;
  phone?: string;
}) {
  if (input.provider === "xendit") {
    return platformXenditCreateInvoice({
      externalId: input.ref,
      amount: input.amount,
      description: input.description,
      email: input.email,
    });
  }
  if (input.provider === "midtrans") {
    return platformMidtransCreateSnap({
      orderId: input.ref,
      amount: input.amount,
      customer: input.customer,
      email: input.email,
    });
  }
  if (input.provider === "nicepay") {
    return platformNicepayRegister({
      referenceNo: input.ref,
      amount: input.amount,
      description: input.description,
      customer: input.customer,
      email: input.email,
      phone: input.phone,
      channel: input.channel,
    });
  }
  return platformDuitkuInquiry({
    merchantOrderId: input.ref,
    paymentAmount: input.amount,
    paymentMethod: input.channel || "SP",
    productDetails: input.description,
    email: input.email,
    phoneNumber: input.phone,
    customerVaName: input.customer || input.ref,
  });
}
