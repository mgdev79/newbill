import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";
import { settleGatewayPayment } from "@/server/gateway-settle";

export type MidtransConfig = {
  serverKey: string;
  clientKey: string;
  environment: "sandbox" | "production";
};

export type MidtransNotification = {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
};

export async function getMidtransConfig(): Promise<MidtransConfig | null> {
  const prisma = await getDb();
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [
          "gateway.midtrans.server_key",
          "gateway.midtrans.client_key",
          "gateway.midtrans.environment",
        ],
      },
    },
  });
  const get = (key: string) => rows.find((row) => row.key === key)?.value ?? "";
  const serverKey = get("gateway.midtrans.server_key");
  if (!serverKey) return null;
  return {
    serverKey,
    clientKey: get("gateway.midtrans.client_key"),
    environment: get("gateway.midtrans.environment") === "sandbox" ? "sandbox" : "production",
  };
}

function snapBase(environment: MidtransConfig["environment"]) {
  return environment === "sandbox"
    ? "https://app.sandbox.midtrans.com"
    : "https://app.midtrans.com";
}

function apiBase(environment: MidtransConfig["environment"]) {
  return environment === "sandbox"
    ? "https://api.sandbox.midtrans.com"
    : "https://api.midtrans.com";
}

function authHeader(serverKey: string) {
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

/** docs.midtrans.com: SHA512(order_id + status_code + gross_amount + ServerKey) */
export function midtransSignature(orderId: string, statusCode: string, grossAmount: string, serverKey: string) {
  return createHash("sha512").update(`${orderId}${statusCode}${grossAmount}${serverKey}`).digest("hex");
}

export function verifyMidtransNotification(body: MidtransNotification, config: MidtransConfig) {
  const expected = midtransSignature(body.order_id, body.status_code, body.gross_amount, config.serverKey);
  return expected === body.signature_key;
}

export function isMidtransPaid(body: MidtransNotification) {
  const status = body.transaction_status;
  if (status === "settlement") return true;
  if (status === "capture" && (body.fraud_status ?? "accept") === "accept") return true;
  return false;
}

export async function midtransCreateSnap(input: {
  orderId: string;
  amount: number;
  customer?: string;
  email?: string;
}) {
  const prisma = await getDb();
  const config = await getMidtransConfig();
  if (!config) return { ok: false as const, error: "Server key Midtrans belum diisi." };
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

export async function midtransGetStatus(orderId: string) {
  const prisma = await getDb();
  const config = await getMidtransConfig();
  if (!config) return null;
  const response = await fetch(`${apiBase(config.environment)}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Authorization: authHeader(config.serverKey), Accept: "application/json" },
  });
  if (!response.ok) return null;
  return (await response.json()) as { transaction_status?: string; status_code?: string };
}

export async function settleMidtransNotification(body: MidtransNotification) {
  const prisma = await getDb();
  const paid = isMidtransPaid(body);
  const failed = ["deny", "cancel", "expire", "failure"].includes(body.transaction_status);
  if (!paid && !failed) {
    return { paid: false, status: "pending" };
  }
  return settleGatewayPayment({
    ref: body.order_id,
    paid,
    channel: body.payment_type ?? "",
    note: `Midtrans ${body.transaction_id ?? body.order_id} · ${body.transaction_status}`,
    method: "Midtrans",
  });
}
