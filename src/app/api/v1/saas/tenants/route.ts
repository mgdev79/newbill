import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicTenant } from "@/lib/saas";

export const runtime = "nodejs";

export async function GET() {
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
}

export async function POST(request: Request) {
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
    const row = await prisma.tenant.create({
      data: {
        code: body.code.trim().toLowerCase(),
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        password: body.password,
        phone: body.phone?.trim() ?? "",
        planId: body.planId,
        status: body.status || "active",
        billingUrl: body.billingUrl?.trim() ?? "",
        radiusPublicIp: body.radiusPublicIp?.trim() ?? "",
        notes: body.notes?.trim() ?? "",
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
      include: { plan: true },
    });
    return NextResponse.json({ row: publicTenant(row) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Code atau email sudah dipakai." }, { status: 409 });
  }
}
