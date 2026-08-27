import { NextResponse } from "next/server";
import { platformPrisma as prisma } from "@/lib/platform-db";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

export const GET = withApiErrorHandling(async function GET() {
  const rows = await prisma.saasPlan.findMany({
    include: { _count: { select: { tenants: true } } },
    orderBy: { priceMonth: "asc" },
  });
  return NextResponse.json({
    rows: rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      priceMonth: row.priceMonth,
      vpnQuota: row.vpnQuota,
      routerLimit: row.routerLimit,
      customerLimit: row.customerLimit,
      voucherLimit: row.voucherLimit,
      sessionLimit: row.sessionLimit,
      description: row.description,
      tenantCount: row._count.tenants,
    })),
  });
});

export const POST = withApiErrorHandling(async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    code?: string;
    priceMonth?: number;
    vpnQuota?: number;
    routerLimit?: number;
    customerLimit?: number;
    voucherLimit?: number;
    sessionLimit?: number;
    description?: string;
  };
  if (!body.name || !body.code) {
    return NextResponse.json({ error: "Nama dan kode wajib." }, { status: 400 });
  }
  try {
    const row = await prisma.saasPlan.create({
      data: {
        name: body.name.trim(),
        code: body.code.trim().toUpperCase(),
        priceMonth: Number(body.priceMonth) || 0,
        vpnQuota: Number(body.vpnQuota) || 1,
        routerLimit: Number(body.routerLimit) || 1,
        customerLimit: Number(body.customerLimit) || 250,
        voucherLimit: Number(body.voucherLimit) || 15000,
        sessionLimit: Number(body.sessionLimit) || 300,
        description: body.description?.trim() || "",
      },
    });
    return NextResponse.json({ row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Nama atau kode sudah dipakai." }, { status: 409 });
  }
});
