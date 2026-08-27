import { NextResponse } from "next/server";
import { writeActivityLog } from "@/server/activity-log";
import { parseNicepayFields } from "@/server/nicepay";
import {
  getPlatformDuitkuConfig,
  parseDuitkuCallback,
  settlePlatformDuitkuPayment,
  verifyDuitkuCallback,
} from "@/server/platform-duitku";
import {
  getPlatformMidtransConfig,
  settlePlatformMidtransNotification,
  verifyMidtransNotification,
  type MidtransNotification,
} from "@/server/platform-midtrans";
import {
  getPlatformNicepayConfig,
  settlePlatformNicepayCallback,
  verifyNicepayCallback,
} from "@/server/platform-nicepay";
import {
  getPlatformXenditConfig,
  settlePlatformXenditWebhook,
  verifyXenditCallback,
} from "@/server/platform-xendit";

export const runtime = "nodejs";

const PROVIDERS = ["duitku", "xendit", "midtrans", "nicepay"] as const;

function isProvider(value: string): value is (typeof PROVIDERS)[number] {
  return PROVIDERS.includes(value as (typeof PROVIDERS)[number]);
}

async function handleDuitku(request: Request) {
  const raw = await request.text();
  const callback = parseDuitkuCallback(raw, request.headers.get("content-type"));
  if (!callback) return new NextResponse("INVALID", { status: 400 });
  const config = await getPlatformDuitkuConfig();
  if (!config) return new NextResponse("UNCONFIGURED", { status: 503 });
  if (!verifyDuitkuCallback(callback, config)) {
    await writeActivityLog({
      kind: "activity",
      actor: "platform-gateway",
      message: `Callback Duitku platform ditolak: HMAC (${callback.merchantOrderId}).`,
    });
    return new NextResponse("BAD SIGNATURE", { status: 400 });
  }
  const settled = await settlePlatformDuitkuPayment(callback);
  await writeActivityLog({
    kind: "activity",
    actor: "platform-gateway",
    message: `Callback Duitku platform ${callback.merchantOrderId} · ${settled.status}.`,
  });
  return new NextResponse("SUCCESS", { status: 200 });
}

async function handleXendit(request: Request) {
  const config = await getPlatformXenditConfig();
  if (!config) return new NextResponse("UNCONFIGURED", { status: 503 });
  const token = request.headers.get("x-callback-token");
  if (!verifyXenditCallback(token, config)) {
    await writeActivityLog({
      kind: "activity",
      actor: "platform-gateway",
      message: "Callback Xendit platform ditolak: x-callback-token.",
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
  const settled = await settlePlatformXenditWebhook(body);
  await writeActivityLog({
    kind: "activity",
    actor: "platform-gateway",
    message: `Callback Xendit platform ${body.external_id ?? ""} · ${settled.status}.`,
  });
  return NextResponse.json({ ok: true });
}

async function handleMidtrans(request: Request) {
  const config = await getPlatformMidtransConfig();
  if (!config) return new NextResponse("UNCONFIGURED", { status: 503 });
  const body = (await request.json()) as MidtransNotification;
  if (!body?.order_id || !body.signature_key) {
    return NextResponse.json({ error: "Notification tidak lengkap." }, { status: 400 });
  }
  if (!verifyMidtransNotification(body, config)) {
    await writeActivityLog({
      kind: "activity",
      actor: "platform-gateway",
      message: `Callback Midtrans platform ditolak: SHA512 (${body.order_id}).`,
    });
    return NextResponse.json({ error: "Signature tidak cocok." }, { status: 403 });
  }
  const settled = await settlePlatformMidtransNotification(body);
  await writeActivityLog({
    kind: "activity",
    actor: "platform-gateway",
    message: `Callback Midtrans platform ${body.order_id} · ${body.transaction_status} · ${settled.status}.`,
  });
  return NextResponse.json({ ok: true });
}

async function handleNicepay(request: Request) {
  const config = await getPlatformNicepayConfig();
  if (!config) return new NextResponse("UNCONFIGURED", { status: 503 });
  const raw = await request.text();
  const fields = parseNicepayFields(raw, request.headers.get("content-type"));
  if (!verifyNicepayCallback(fields, config)) {
    await writeActivityLog({
      kind: "activity",
      actor: "platform-gateway",
      message: `Callback Nicepay platform ditolak (${fields.referenceNo ?? ""}).`,
    });
    return new NextResponse("BAD TOKEN", { status: 400 });
  }
  const settled = await settlePlatformNicepayCallback(fields);
  await writeActivityLog({
    kind: "activity",
    actor: "platform-gateway",
    message: `Callback Nicepay platform ${fields.referenceNo ?? ""} · ${settled.status}.`,
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
