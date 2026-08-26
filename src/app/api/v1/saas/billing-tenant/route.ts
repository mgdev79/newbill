import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BILLING_TENANT_SETTING } from "@/lib/saas";

export const runtime = "nodejs";

/** Tenant mana yang lisensinya dipakai panel operator (/settings/license). */
export async function GET() {
  const setting = await prisma.appSetting.findUnique({
    where: { key: BILLING_TENANT_SETTING },
  });
  const code = setting?.value || "ariyana";
  const tenant = await prisma.tenant.findUnique({
    where: { code },
    select: { id: true, code: true, name: true, email: true },
  });
  return NextResponse.json({ code, tenant });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { code?: string };
  if (!body.code?.trim()) {
    return NextResponse.json({ error: "Kode tenant wajib." }, { status: 400 });
  }
  const tenant = await prisma.tenant.findUnique({
    where: { code: body.code.trim() },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant tidak ditemukan." }, { status: 404 });
  }
  await prisma.appSetting.upsert({
    where: { key: BILLING_TENANT_SETTING },
    create: { key: BILLING_TENANT_SETTING, value: tenant.code },
    update: { value: tenant.code },
  });
  return NextResponse.json({ ok: true, code: tenant.code, tenantId: tenant.id });
}
