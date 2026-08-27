import { NextResponse } from "next/server";
import { platformPrisma as prisma } from "@/lib/platform-db";
import { tenantSubdomain } from "@/lib/tenant-host";
import { createPlatformGatewayCharge } from "@/server/platform-gateway";
import { getActivePlatformGatewayProvider } from "@/server/platform-gateway-settings";
import { activateTenantSignup } from "@/server/tenant-signup";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

export const GET = withApiErrorHandling(async function GET() {
  const [plans, provider] = await Promise.all([
    prisma.saasPlan.findMany({ orderBy: { priceMonth: "asc" } }),
    getActivePlatformGatewayProvider(),
  ]);
  return NextResponse.json({
    provider,
    needChannel: provider === "duitku" || provider === "nicepay",
    plans: plans.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      priceMonth: row.priceMonth,
      vpnQuota: row.vpnQuota,
      routerLimit: row.routerLimit,
      customerLimit: row.customerLimit,
      description: row.description,
    })),
  });
});

export const POST = withApiErrorHandling(async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
    subdomain?: string;
    planId?: string;
    paymentChannel?: string;
  };

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const phone = (body.phone ?? "").trim();
  const subdomain = tenantSubdomain(body.subdomain ?? "");
  const planId = body.planId?.trim() ?? "";
  const paymentChannel = (body.paymentChannel ?? "").trim().toUpperCase();

  if (!name || !email || !password || !subdomain || !planId) {
    return NextResponse.json(
      { error: "Nama, email, password, subdomain, dan paket wajib." },
      { status: 400 },
    );
  }
  if (!SUBDOMAIN_RE.test(subdomain) || subdomain === "www" || subdomain === "saas") {
    return NextResponse.json({ error: "Subdomain tidak valid." }, { status: 400 });
  }

  const plan = await prisma.saasPlan.findUnique({ where: { id: planId } });
  if (!plan) return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });

  const clash = await prisma.tenant.findFirst({
    where: { OR: [{ code: subdomain }, { email }] },
  });
  if (clash) {
    return NextResponse.json({ error: "Subdomain atau email sudah terdaftar." }, { status: 409 });
  }
  const pending = await prisma.tenantSignupOrder.findFirst({
    where: {
      status: "pending",
      OR: [{ subdomain }, { email }],
    },
  });
  if (pending) {
    return NextResponse.json(
      { error: "Sudah ada order pending untuk subdomain atau email ini. Selesaikan pembayaran atau hubungi admin." },
      { status: 409 },
    );
  }

  const amount = plan.priceMonth;
  const provider = await getActivePlatformGatewayProvider();
  const order = await prisma.tenantSignupOrder.create({
    data: {
      name,
      email,
      password,
      phone,
      subdomain,
      planId: plan.id,
      planName: plan.name,
      amount,
      paymentChannel: paymentChannel || (provider === "duitku" ? "SP" : ""),
      status: "pending",
      paymentRef: "",
      note: `Signup ${plan.name}`,
    },
  });
  await prisma.tenantSignupOrder.update({
    where: { id: order.id },
    data: { paymentRef: order.id },
  });

  if (amount <= 0) {
    const result = await activateTenantSignup({ ...order, paymentRef: order.id }, {
      status: "paid",
      note: "Paket gratis · aktivasi langsung tanpa gateway",
    });
    return NextResponse.json({
      row: { id: order.id, status: "paid", subdomain },
      tenantId: result.tenant.id,
      payment: { paymentUrl: "", instruction: "Paket gratis. Akun sudah aktif." },
    }, { status: 201 });
  }

  const inquiry = await createPlatformGatewayCharge({
    provider,
    ref: order.id,
    amount,
    channel: paymentChannel || "SP",
    description: `Newbill ${plan.name} · ${subdomain}`,
    customer: name,
    email,
    phone,
  });
  if (inquiry.ok && inquiry.reference) {
    await prisma.tenantSignupOrder.update({
      where: { id: order.id },
      data: { paymentRef: inquiry.reference },
    });
  }

  return NextResponse.json(
    {
      row: {
        id: order.id,
        name: order.name,
        email: order.email,
        subdomain: order.subdomain,
        planName: order.planName,
        amount: order.amount,
        status: order.status,
      },
      payment: {
        provider,
        paymentUrl: inquiry.ok ? inquiry.paymentUrl : "",
        vaNumber: inquiry.ok && "vaNumber" in inquiry ? inquiry.vaNumber ?? "" : "",
        error: inquiry.ok ? undefined : inquiry.error,
        instruction: inquiry.ok
          ? inquiry.paymentUrl
            ? `Lanjutkan pembayaran di halaman ${provider}.`
            : "Menunggu pembayaran."
          : inquiry.error,
      },
    },
    { status: 201 },
  );
});
