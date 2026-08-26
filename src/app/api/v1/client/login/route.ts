import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TENANT_COOKIE, clearCookieOptions, cookieOptions } from "@/lib/auth-cookies";
import { publicTenant } from "@/lib/saas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Email dan password wajib." }, { status: 400 });
  }
  const row = await prisma.tenant.findUnique({
    where: { email: body.email.trim().toLowerCase() },
    include: { plan: true },
  });
  if (!row || row.password !== body.password) {
    return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
  }
  if (row.status === "suspended") {
    return NextResponse.json({ error: "Akun tenant ditangguhkan." }, { status: 403 });
  }

  const response = NextResponse.json({ row: publicTenant(row) });
  response.cookies.set(TENANT_COOKIE, row.id, cookieOptions());
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(TENANT_COOKIE, "", clearCookieOptions());
  return response;
}
