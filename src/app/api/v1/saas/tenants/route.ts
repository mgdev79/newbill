import { NextResponse } from "next/server";
import { platformPrisma as prisma } from "@/lib/platform-db";
import { publicTenant } from "@/lib/saas";
import { createPlatformTenant } from "@/server/tenant-signup";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

export const GET = withApiErrorHandling(async function GET() {
  const rows = await prisma.tenant.findMany({
    include: { plan: true, vpnAccounts: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    rows: rows.map((row) => ({
      ...publicTenant(row),
      vpnUsed: row.vpnAccounts.length,
    })),
  });
});

export const POST = withApiErrorHandling(async function POST(request: Request) {
  const body = (await request.json()) as {
    code?: string;
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
    planId?: string;
    status?: string;
    billingUrl?: string;
    radiusPublicIp?: string;
    notes?: string;
    expiresAt?: string;
  };

  if (!body.code || !body.name || !body.email || !body.password || !body.planId) {
    return NextResponse.json(
      { error: "Code, nama, email, password, dan paket wajib." },
      { status: 400 },
    );
  }

  const plan = await prisma.saasPlan.findUnique({ where: { id: body.planId } });
  if (!plan) return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });

  try {
    const row = await createPlatformTenant({
      code: body.code,
      name: body.name,
      email: body.email,
      password: body.password,
      phone: body.phone,
      planId: body.planId,
      status: body.status,
      billingUrl: body.billingUrl,
      radiusPublicIp: body.radiusPublicIp,
      notes: body.notes,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    });
    return NextResponse.json({ row: publicTenant(row) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Code atau email sudah dipakai." }, { status: 409 });
  }
});
