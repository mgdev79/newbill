import { NextResponse } from "next/server";
import { writeActivityLog } from "@/server/activity-log";
import {
  getDuitkuConfig,
  parseDuitkuCallback,
  settleDuitkuPayment,
  verifyDuitkuCallback,
  duitkuTransactionStatus,
} from "@/server/duitku";
import {
  getMidtransConfig,
  midtransGetStatus,
  settleMidtransNotification,
  verifyMidtransNotification,
  type MidtransNotification,
} from "@/server/midtrans";
import {
  getNicepayConfig,
  parseNicepayFields,
  settleNicepayCallback,
  verifyNicepayCallback,
} from "@/server/nicepay";
import { getXenditConfig, settleXenditWebhook, verifyXenditCallback } from "@/server/xendit";

export const runtime = "nodejs";

const PROVIDERS = ["duitku", "xendit", "midtrans", "nicepay"] as const;

function isProvider(value: string): value is (typeof PROVIDERS)[number] {
  return PROVIDERS.includes(value as (typeof PROVIDERS)[number]);
}

async function handleDuitku(request: Request) {
  const raw = await request.text();
  const callback = parseDuitkuCallback(raw, request.headers.get("content-type"));
  if (!callback) return new NextResponse("INVALID", { status: 400 });
  const config = await getDuitkuConfig();
  if (!config) return new NextResponse("UNCONFIGURED", { status: 503 });
  if (!verifyDuitkuCallback(callback, config)) {
    await writeActivityLog({
      kind: "activity",
      actor: "gateway",
      message: `Callback Duitku ditolak: signature HMAC tidak cocok (${callback.merchantOrderId}).`,
    });
    return new NextResponse("BAD SIGNATURE", { status: 400 });
  }
  await duitkuTransactionStatus(callback.merchantOrderId);
  const settled = await settleDuitkuPayment(callback);
  await writeActivityLog({
    kind: "activity",
    actor: "gateway",
    message: `Callback Duitku ${callback.merchantOrderId} HMAC ok · ${settled.status}.`,
  });
  return new NextResponse("SUCCESS", { status: 200 });
}

async function handleXendit(request: Request) {
  const config = await getXenditConfig();
  if (!config) return new NextResponse("UNCONFIGURED", { status: 503 });
  const token = request.headers.get("x-callback-token");
  if (!verifyXenditCallback(token, config)) {
    await writeActivityLog({
      kind: "activity",
      actor: "gateway",
      message: "Callback Xendit ditolak: x-callback-token tidak cocok.",
    });
    return new NextResponse("BAD TOKEN", { status: 400 });
  }
  const body = (await request.json()) as {
    external_id?: string;
    status?: string;
    amount?: number;
    paid_amount?: number;
    payment_method?: string;
    id?: string;
  };
  const settled = await settleXenditWebhook(body);
  await writeActivityLog({
    kind: "activity",
    actor: "gateway",
    message: `Callback Xendit ${body.external_id ?? ""} token ok · ${settled.status}.`,
  });
  return NextResponse.json({ ok: true });
}

async function handleMidtrans(request: Request) {
  const config = await getMidtransConfig();
  if (!config) return new NextResponse("UNCONFIGURED", { status: 503 });
  const body = (await request.json()) as MidtransNotification;
  if (!body?.order_id || !body.signature_key) {
    return NextResponse.json({ error: "Notification tidak lengkap." }, { status: 400 });
  }
  if (!verifyMidtransNotification(body, config)) {
    await writeActivityLog({
      kind: "activity",
      actor: "gateway",
      message: `Callback Midtrans ditolak: SHA512 tidak cocok (${body.order_id}).`,
    });
    return NextResponse.json({ error: "Signature tidak cocok." }, { status: 403 });
  }
  await midtransGetStatus(body.order_id);
  const settled = await settleMidtransNotification(body);
  await writeActivityLog({
    kind: "activity",
    actor: "gateway",
    message: `Callback Midtrans ${body.order_id} SHA512 ok · ${body.transaction_status} · ${settled.status}.`,
  });
  return NextResponse.json({ ok: true });
}

async function handleNicepay(request: Request) {
  const config = await getNicepayConfig();
  if (!config) return new NextResponse("UNCONFIGURED", { status: 503 });
  const raw = await request.text();
  const fields = parseNicepayFields(raw, request.headers.get("content-type"));
  if (!verifyNicepayCallback(fields, config)) {
    await writeActivityLog({
      kind: "activity",
      actor: "gateway",
      message: `Callback Nicepay ditolak: merchantToken tidak cocok (${fields.referenceNo ?? ""}).`,
    });
    return new NextResponse("BAD TOKEN", { status: 400 });
  }
  const settled = await settleNicepayCallback(fields);
  await writeActivityLog({
    kind: "activity",
    actor: "gateway",
    message: `Callback Nicepay ${fields.referenceNo ?? ""} token ok · ${settled.status}.`,
  });
  return new NextResponse("OK", { status: 200 });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: provider } = await context.params;
  if (!isProvider(provider)) {
    return NextResponse.json({ error: "Provider tidak dikenal." }, { status: 404 });
  }
  if (provider === "duitku") return handleDuitku(request);
  if (provider === "xendit") return handleXendit(request);
  if (provider === "midtrans") return handleMidtrans(request);
  return handleNicepay(request);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: provider } = await context.params;
  if (!isProvider(provider)) {
    return NextResponse.json({ error: "Provider tidak dikenal." }, { status: 404 });
  }
  return NextResponse.json({ error: "Gunakan POST dari payment gateway." }, { status: 405 });
}
