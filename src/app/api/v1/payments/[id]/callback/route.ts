import { NextResponse } from "next/server";
import { writeActivityLog } from "@/server/activity-log";
import {
  getDuitkuConfig,
  parseDuitkuCallback,
  settleDuitkuPayment,
  verifyDuitkuCallback,
  duitkuTransactionStatus,
} from "@/server/duitku";
import { syncCustomerById } from "@/server/radius-hooks";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const PROVIDERS = ["duitku", "xendit", "midtrans", "nicepay"] as const;

function isProvider(value: string): value is (typeof PROVIDERS)[number] {
  return PROVIDERS.includes(value as (typeof PROVIDERS)[number]);
}

async function handleDuitku(request: Request) {
  const raw = await request.text();
  const callback = parseDuitkuCallback(raw, request.headers.get("content-type"));
  if (!callback) {
    return new NextResponse("INVALID", { status: 400 });
  }
  const config = await getDuitkuConfig();
  if (!config) {
    return new NextResponse("UNCONFIGURED", { status: 503 });
  }
  if (!verifyDuitkuCallback(callback, config)) {
    await writeActivityLog({
      kind: "activity",
      actor: "gateway",
      message: `Callback Duitku ditolak: signature HMAC tidak cocok (${callback.merchantOrderId}).`,
    });
    return new NextResponse("BAD SIGNATURE", { status: 400 });
  }

  const remote = await duitkuTransactionStatus(callback.merchantOrderId);
  if (remote?.statusCode && remote.statusCode !== callback.resultCode && callback.resultCode === "00") {
    await writeActivityLog({
      kind: "activity",
      actor: "gateway",
      message: `Callback Duitku ${callback.merchantOrderId}: HMAC ok, status remote ${remote.statusCode}.`,
    });
  }

  const settled = await settleDuitkuPayment(callback);
  if (settled.paid) {
    const invoice = await prisma.invoice.findUnique({
      where: { number: callback.merchantOrderId },
    });
    if (invoice) await syncCustomerById(invoice.customerId);
  }
  await writeActivityLog({
    kind: "activity",
    actor: "gateway",
    message: `Callback Duitku ${callback.merchantOrderId} HMAC ok · result ${callback.resultCode}.`,
  });
  return new NextResponse("SUCCESS", { status: 200 });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: provider } = await context.params;
  if (!isProvider(provider)) {
    return NextResponse.json({ error: "Provider tidak dikenal." }, { status: 404 });
  }
  if (provider === "duitku") {
    return handleDuitku(request);
  }

  const raw = await request.text();
  await writeActivityLog({
    kind: "activity",
    actor: "gateway",
    message: `Callback ${provider} diterima (${raw.length} byte). Verifikasi signature ${provider} belum diaktifkan.`,
  });
  return NextResponse.json(
    {
      error: `Callback ${provider} diterima. Verifikasi signature belum diaktifkan.`,
    },
    { status: 202 },
  );
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
