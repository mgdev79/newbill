import { platformSignupReturnUrl } from "@/lib/tenant-host";
import { getPlatformGatewaySetting } from "@/server/platform-gateway-settings";
import { settlePlatformGatewayPayment } from "@/server/platform-gateway-settle";
import { verifyXenditCallback, type XenditConfig } from "@/server/xendit";

const API = "https://api.xendit.co";

export async function getPlatformXenditConfig(): Promise<XenditConfig | null> {
  const row = await getPlatformGatewaySetting();
  if (!row.xenditApiSecret || !row.xenditWebhookToken) return null;
  return { apiSecret: row.xenditApiSecret, webhookToken: row.xenditWebhookToken };
}

function authHeader(apiSecret: string) {
  return `Basic ${Buffer.from(`${apiSecret}:`).toString("base64")}`;
}

export async function platformXenditCreateInvoice(input: {
  externalId: string;
  amount: number;
  description: string;
  email?: string;
}) {
  const config = await getPlatformXenditConfig();
  if (!config) return { ok: false as const, error: "API Secret / webhook token Xendit platform belum diisi." };
  const successUrl = platformSignupReturnUrl();
  const response = await fetch(`${API}/v2/invoices`, {
    method: "POST",
    headers: {
      Authorization: authHeader(config.apiSecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_id: input.externalId,
      amount: Math.round(input.amount),
      description: input.description,
      currency: "IDR",
      success_redirect_url: successUrl,
      failure_redirect_url: successUrl,
      payer_email: input.email || undefined,
    }),
  });
  const data = (await response.json().catch(() => null)) as {
    id?: string;
    invoice_url?: string;
    error_code?: string;
    message?: string;
  } | null;
  if (!response.ok) {
    return { ok: false as const, error: data?.message || data?.error_code || `Xendit HTTP ${response.status}` };
  }
  return {
    ok: true as const,
    paymentUrl: data?.invoice_url ?? "",
    reference: data?.id ?? "",
  };
}

export async function settlePlatformXenditWebhook(body: {
  external_id?: string;
  status?: string;
  amount?: number;
  paid_amount?: number;
  payment_method?: string;
  id?: string;
}) {
  const ref = body.external_id?.trim() ?? "";
  if (!ref) return { paid: false, status: "failed" as const };
  const paid = (body.status ?? "").toUpperCase() === "PAID";
  return settlePlatformGatewayPayment({
    ref,
    paid,
    channel: body.payment_method ?? "",
    note: `Xendit platform ${body.id ?? ref} · ${body.status ?? ""} · ${body.paid_amount ?? body.amount ?? ""}`,
  });
}

export { verifyXenditCallback };
