import { getDb } from "@/lib/db";
import { getBillingTenant } from "@/lib/saas";
import { tenantPublicOrigin } from "@/lib/tenant-host";
import { settleGatewayPayment } from "@/server/gateway-settle";

const API = "https://api.xendit.co";

export type XenditConfig = {
  apiSecret: string;
  webhookToken: string;
};

export async function getXenditConfig(): Promise<XenditConfig | null> {
  const prisma = await getDb();
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: ["gateway.xendit.api_secret", "gateway.xendit.webhook_token"] } },
  });
  const get = (key: string) => rows.find((row) => row.key === key)?.value ?? "";
  const apiSecret = get("gateway.xendit.api_secret");
  const webhookToken = get("gateway.xendit.webhook_token");
  if (!apiSecret || !webhookToken) return null;
  return { apiSecret, webhookToken };
}

/** docs.xendit.co: setiap webhook membawa header x-callback-token. */
export function verifyXenditCallback(headerToken: string | null, config: XenditConfig) {
  return Boolean(headerToken) && headerToken === config.webhookToken;
}

function authHeader(apiSecret: string) {
  return `Basic ${Buffer.from(`${apiSecret}:`).toString("base64")}`;
}

export async function xenditCreateInvoice(input: {
  externalId: string;
  amount: number;
  description: string;
  email?: string;
}) {
  const config = await getXenditConfig();
  if (!config) return { ok: false as const, error: "API Secret / webhook token Xendit belum diisi." };
  const tenant = await getBillingTenant();
  if (!tenant) return { ok: false as const, error: "Tenant billing belum dikonfigurasi." };
  const successUrl = `${tenantPublicOrigin(tenant.code)}/payments/duitku`;
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

export async function settleXenditWebhook(body: {
  external_id?: string;
  status?: string;
  amount?: number;
  paid_amount?: number;
  payment_method?: string;
  id?: string;
}) {
  const ref = body.external_id?.trim() ?? "";
  if (!ref) return { paid: false, status: "failed" };
  const paid = (body.status ?? "").toUpperCase() === "PAID";
  return settleGatewayPayment({
    ref,
    paid,
    channel: body.payment_method ?? "",
    note: `Xendit ${body.id ?? ref} · ${body.status ?? ""} · ${body.paid_amount ?? body.amount ?? ""}`,
    method: "Xendit",
  });
}
