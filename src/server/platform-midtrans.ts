import { platformSignupReturnUrl } from "@/lib/tenant-host";
import {
  isMidtransPaid,
  midtransSignature,
  verifyMidtransNotification,
  type MidtransConfig,
  type MidtransNotification,
} from "@/server/midtrans";
import { getPlatformGatewaySetting } from "@/server/platform-gateway-settings";
import { settlePlatformGatewayPayment } from "@/server/platform-gateway-settle";

export async function getPlatformMidtransConfig(): Promise<MidtransConfig | null> {
  const row = await getPlatformGatewaySetting();
  if (!row.midtransServerKey) return null;
  return {
    serverKey: row.midtransServerKey,
    clientKey: row.midtransClientKey,
    environment: row.midtransEnvironment === "sandbox" ? "sandbox" : "production",
  };
}

function snapBase(environment: MidtransConfig["environment"]) {
  return environment === "sandbox"
    ? "https://app.sandbox.midtrans.com"
    : "https://app.midtrans.com";
}

function authHeader(serverKey: string) {
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

export async function platformMidtransCreateSnap(input: {
  orderId: string;
  amount: number;
  customer?: string;
  email?: string;
}) {
  const config = await getPlatformMidtransConfig();
  if (!config) return { ok: false as const, error: "Server key Midtrans platform belum diisi." };
  const finish = platformSignupReturnUrl();
  const response = await fetch(`${snapBase(config.environment)}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Authorization: authHeader(config.serverKey),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.orderId,
        gross_amount: Math.round(input.amount),
      },
      customer_details: input.customer
        ? { first_name: input.customer, email: input.email || undefined }
        : undefined,
      callbacks: { finish },
    }),
  });
  const data = (await response.json().catch(() => null)) as {
    token?: string;
    redirect_url?: string;
    error_messages?: string[];
    status_message?: string;
  } | null;
  if (!response.ok) {
    return {
      ok: false as const,
      error: data?.error_messages?.join(", ") || data?.status_message || `Midtrans HTTP ${response.status}`,
    };
  }
  return {
    ok: true as const,
    paymentUrl: data?.redirect_url ?? "",
    reference: data?.token ?? "",
  };
}

export async function settlePlatformMidtransNotification(body: MidtransNotification) {
  const paid = isMidtransPaid(body);
  const failed = ["deny", "cancel", "expire", "failure"].includes(body.transaction_status);
  if (!paid && !failed) {
    return { paid: false, status: "pending" as const };
  }
  return settlePlatformGatewayPayment({
    ref: body.order_id,
    paid,
    channel: body.payment_type ?? "",
    note: `Midtrans platform ${body.transaction_id ?? body.order_id} · ${body.transaction_status}`,
  });
}

export { midtransSignature, verifyMidtransNotification };
export type { MidtransNotification };
