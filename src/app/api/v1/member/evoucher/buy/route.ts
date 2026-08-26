import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyGateToken } from "@/lib/member-captcha";
import { createGatewayCharge } from "@/server/gateway-charge";
import { getActiveGatewayProvider } from "@/server/gateway-settle";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const jar = await cookies();
  if (!verifyGateToken(jar.get("nb_evoucher_gate")?.value)) {
    return NextResponse.json({ error: "Sesi keamanan berakhir." }, { status: 401 });
  }

  const body = (await request.json()) as {
    customer?: string;
    email?: string;
    phone?: string;
    planId?: string;
    qty?: number;
    hotspotDomain?: string;
    paymentChannel?: string;
  };

  const customer = (body.customer ?? "").trim();
  const email = (body.email ?? "").trim();
  const phone = (body.phone ?? "").trim().replace(/\D/g, "");
  const planId = (body.planId ?? "").trim();
  const qty = Math.min(Math.max(Number(body.qty) || 1, 1), 20);
  const hotspotDomain =
    !body.hotspotDomain || body.hotspotDomain === "-"
      ? ""
      : body.hotspotDomain.trim();
  const paymentChannel = (body.paymentChannel ?? "").trim().toUpperCase();

  if (!customer) {
    return NextResponse.json({ error: "Nama lengkap wajib." }, { status: 400 });
  }
  if (!phone || phone.length < 10) {
    return NextResponse.json(
      { error: "No. WhatsApp wajib (kode negara tanpa +, mis. 62812...)." },
      { status: 400 },
    );
  }
  if (!planId) {
    return NextResponse.json({ error: "Pilih paket voucher." }, { status: 400 });
  }
  if (!paymentChannel) {
    return NextResponse.json({ error: "Pilih metode pembayaran." }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || plan.type !== "hotspot") {
    return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });
  }

  const amount = plan.priceSell * qty;
  const row = await prisma.evoucherOrder.create({
    data: {
      source: "portal",
      customer,
      phone,
      email,
      planName: plan.name,
      planId: plan.id,
      qty,
      amount,
      hotspotDomain,
      paymentChannel,
      status: "pending_payment",
      note: `Portal e-voucher · channel ${paymentChannel}${
        hotspotDomain ? ` · DNS ${hotspotDomain}` : ""
      }`,
    },
  });

  const provider = await getActiveGatewayProvider();
  const inquiry = await createGatewayCharge({
    provider,
    ref: row.id,
    amount,
    channel: paymentChannel,
    description: `e-Voucher ${plan.name} x${qty}`,
    customer,
    email: email || undefined,
    phone,
  });
  if (inquiry.ok) {
    await prisma.paymentTxn.create({
      data: {
        ref: row.id,
        customer,
        amount,
        channel: paymentChannel,
        status: "pending",
        provider,
        note: inquiry.reference,
      },
    }).catch(() => null);
  }

  return NextResponse.json(
    {
      row: {
        id: row.id,
        customer: row.customer,
        phone: row.phone,
        email: row.email,
        planName: row.planName,
        qty: row.qty,
        amount: row.amount,
        hotspotDomain: row.hotspotDomain,
        paymentChannel: row.paymentChannel,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      },
      payment: {
        channel: paymentChannel,
        amount,
        paymentUrl: inquiry.ok ? inquiry.paymentUrl : "",
        vaNumber: inquiry.ok ? inquiry.vaNumber : "",
        qrString: inquiry.ok ? inquiry.qrString : "",
        error: inquiry.ok ? undefined : inquiry.error,
        instruction: inquiry.ok
          ? inquiry.paymentUrl
            ? `Lanjutkan pembayaran di halaman ${provider}.`
            : inquiry.vaNumber
              ? `Transfer VA ${inquiry.vaNumber}.`
              : `Menunggu pembayaran ${provider}.`
          : inquiry.error,
      },
    },
    { status: 201 },
  );
}
