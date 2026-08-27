import { platformGatewayCallbackUrl, platformSignupReturnUrl } from "@/lib/tenant-host";
import {
  duitkuHmac,
  mapDuitkuChannel,
  parseDuitkuCallback,
  verifyDuitkuCallback,
  type DuitkuCallback,
  type DuitkuConfig,
} from "@/server/duitku";
import { getPlatformGatewaySetting } from "@/server/platform-gateway-settings";
import { settlePlatformGatewayPayment } from "@/server/platform-gateway-settle";

const SANDBOX = "https://sandbox.duitku.com/webapi/api/merchant";
const PRODUCTION = "https://passport.duitku.com/webapi/api/merchant";

export async function getPlatformDuitkuConfig(): Promise<DuitkuConfig | null> {
  const row = await getPlatformGatewaySetting();
  if (!row.duitkuMerchantCode || !row.duitkuApiKey) return null;
  return {
    merchantCode: row.duitkuMerchantCode,
    apiKey: row.duitkuApiKey,
    environment: row.duitkuEnvironment === "sandbox" ? "sandbox" : "production",
  };
}

function baseUrl(environment: DuitkuConfig["environment"]) {
  return environment === "sandbox" ? SANDBOX : PRODUCTION;
}

export async function platformDuitkuInquiry(input: {
  merchantOrderId: string;
  paymentAmount: number;
  paymentMethod: string;
  productDetails: string;
  email?: string;
  phoneNumber?: string;
  customerVaName?: string;
  additionalParam?: string;
}) {
  const config = await getPlatformDuitkuConfig();
  if (!config) {
    return { ok: false as const, error: "Merchant platform Duitku belum diisi (SaaS Admin → Gateway platform)." };
  }
  const paymentAmount = Math.round(input.paymentAmount);
  const signature = duitkuHmac(
    `${config.merchantCode}${input.merchantOrderId}${paymentAmount}`,
    config.apiKey,
  );
  const payload = {
    merchantCode: config.merchantCode,
    paymentAmount,
    paymentMethod: mapDuitkuChannel(input.paymentMethod),
    merchantOrderId: input.merchantOrderId,
    productDetails: input.productDetails,
    additionalParam: input.additionalParam ?? "",
    email: input.email ?? "",
    phoneNumber: input.phoneNumber ?? "",
    customerVaName: input.customerVaName ?? input.productDetails,
    callbackUrl: platformGatewayCallbackUrl("duitku"),
    returnUrl: platformSignupReturnUrl(),
    signature,
    expiryPeriod: 60,
  };
  const response = await fetch(`${baseUrl(config.environment)}/v2/inquiry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as {
    paymentUrl?: string;
    reference?: string;
    vaNumber?: string;
    qrString?: string;
    statusCode?: string;
    statusMessage?: string;
    Message?: string;
  } | null;
  if (!response.ok) {
    return {
      ok: false as const,
      error: data?.statusMessage || data?.Message || `Duitku HTTP ${response.status}`,
    };
  }
  return {
    ok: true as const,
    paymentUrl: data?.paymentUrl ?? "",
    reference: data?.reference ?? "",
    vaNumber: data?.vaNumber ?? "",
    qrString: data?.qrString ?? "",
    statusMessage: data?.statusMessage ?? "",
  };
}

export async function settlePlatformDuitkuPayment(callback: DuitkuCallback) {
  const paid = callback.resultCode === "00";
  return settlePlatformGatewayPayment({
    ref: callback.merchantOrderId,
    paid,
    channel: callback.paymentCode,
    note: `Duitku platform ${callback.reference || callback.merchantOrderId} · ${callback.paymentCode} · result ${callback.resultCode}`,
  });
}

export { parseDuitkuCallback, verifyDuitkuCallback };
export type { DuitkuCallback };
