import { createHmac } from "node:crypto";
import { getDb } from "@/lib/db";
import { getBillingTenant } from "@/lib/saas";
import { gatewayCallbackUrl, tenantPublicOrigin } from "@/lib/tenant-host";
import { settleGatewayPayment } from "@/server/gateway-settle";

const SANDBOX = "https://sandbox.duitku.com/webapi/api/merchant";
const PRODUCTION = "https://passport.duitku.com/webapi/api/merchant";

export type DuitkuConfig = {
  merchantCode: string;
  apiKey: string;
  environment: "sandbox" | "production";
};

export type DuitkuCallback = {
  merchantCode: string;
  amount: string;
  merchantOrderId: string;
  productDetail: string;
  additionalParam: string;
  paymentCode: string;
  resultCode: string;
  merchantUserId: string;
  reference: string;
  signature: string;
};

export function duitkuHmac(message: string, apiKey: string) {
  return createHmac("sha256", apiKey).update(message).digest("hex");
}

export async function getDuitkuConfig(): Promise<DuitkuConfig | null> {
  const prisma = await getDb();
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [
          "gateway.provider",
          "gateway.duitku.merchant_code",
          "gateway.duitku.api_key",
          "gateway.duitku.environment",
          "gateway.merchant_code",
          "gateway.api_key",
        ],
      },
    },
  });
  const get = (key: string) => rows.find((row) => row.key === key)?.value ?? "";
  const merchantCode = get("gateway.duitku.merchant_code") || get("gateway.merchant_code");
  const apiKey = get("gateway.duitku.api_key") || get("gateway.api_key");
  if (!merchantCode || !apiKey) return null;
  return {
    merchantCode,
    apiKey,
    environment: get("gateway.duitku.environment") === "sandbox" ? "sandbox" : "production",
  };
}

function baseUrl(environment: DuitkuConfig["environment"]) {
  return environment === "sandbox" ? SANDBOX : PRODUCTION;
}

export function parseDuitkuCallback(raw: string, contentType: string | null): DuitkuCallback | null {
  const fields = new URLSearchParams();
  if ((contentType ?? "").includes("application/json")) {
    try {
      const json = JSON.parse(raw) as Record<string, unknown>;
      for (const [key, value] of Object.entries(json)) {
        if (value == null) continue;
        fields.set(key, String(value));
      }
    } catch {
      return null;
    }
  } else {
    const parsed = new URLSearchParams(raw);
    for (const [key, value] of parsed) fields.set(key, value);
  }
  const merchantCode = fields.get("merchantCode") ?? "";
  const amount = fields.get("amount") ?? "";
  const merchantOrderId = fields.get("merchantOrderId") ?? "";
  const signature = fields.get("signature") ?? "";
  if (!merchantCode || !amount || !merchantOrderId || !signature) return null;
  return {
    merchantCode,
    amount,
    merchantOrderId,
    productDetail: fields.get("productDetail") ?? "",
    additionalParam: fields.get("additionalParam") ?? "",
    paymentCode: fields.get("paymentCode") ?? "",
    resultCode: fields.get("resultCode") ?? "",
    merchantUserId: fields.get("merchantUserId") ?? "",
    reference: fields.get("reference") ?? "",
    signature,
  };
}

/** docs.duitku.com: HMAC_SHA256(merchantCode + amount + merchantOrderId, apiKey) */
export function verifyDuitkuCallback(callback: DuitkuCallback, config: DuitkuConfig) {
  if (callback.merchantCode !== config.merchantCode) return false;
  const expected = duitkuHmac(
    `${callback.merchantCode}${callback.amount}${callback.merchantOrderId}`,
    config.apiKey,
  );
  return expected === callback.signature.toLowerCase() || expected === callback.signature;
}

export function mapDuitkuChannel(channel: string) {
  const code = channel.trim().toUpperCase();
  if (code.length === 2) return code;
  if (code === "QRIS") return "SP";
  if (code === "ALFAMART" || code === "ALFA" || code === "PEGADAIAN") return "FT";
  if (code === "INDOMARET") return "IR";
  if (code === "BCA") return "BC";
  if (code === "MANDIRI") return "M2";
  if (code === "BNI") return "I1";
  if (code === "BRI" || code === "BRIVA") return "BR";
  if (code === "DANA") return "DA";
  if (code === "OVO") return "OV";
  return "SP";
}

export async function duitkuInquiry(input: {
  merchantOrderId: string;
  paymentAmount: number;
  paymentMethod: string;
  productDetails: string;
  email?: string;
  phoneNumber?: string;
  customerVaName?: string;
  additionalParam?: string;
}) {
  const prisma = await getDb();
  const config = await getDuitkuConfig();
  if (!config) {
    return { ok: false as const, error: "Merchant code / API key Duitku belum diisi." };
  }
  const tenant = await getBillingTenant();
  if (!tenant) {
    return { ok: false as const, error: "Tenant billing belum dikonfigurasi." };
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
    callbackUrl: gatewayCallbackUrl(tenant.code, "duitku"),
    returnUrl: `${tenantPublicOrigin(tenant.code)}/payments/duitku`,
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

export async function duitkuTransactionStatus(merchantOrderId: string) {
  const prisma = await getDb();
  const config = await getDuitkuConfig();
  if (!config) return null;
  const signature = duitkuHmac(`${config.merchantCode}${merchantOrderId}`, config.apiKey);
  const response = await fetch(`${baseUrl(config.environment)}/transactionStatus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantCode: config.merchantCode,
      merchantOrderId,
      signature,
    }),
  });
  if (!response.ok) return null;
  return (await response.json()) as { statusCode?: string; statusMessage?: string };
}

export async function settleDuitkuPayment(callback: DuitkuCallback) {
  const prisma = await getDb();
  const paid = callback.resultCode === "00";
  return settleGatewayPayment({
    ref: callback.merchantOrderId,
    paid,
    channel: callback.paymentCode,
    note: `Duitku ${callback.reference || callback.merchantOrderId} · ${callback.paymentCode} · result ${callback.resultCode}`,
    method: "Duitku",
  });
}
