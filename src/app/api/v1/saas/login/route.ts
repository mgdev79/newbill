import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SAAS_COOKIE,
  clearCookieOptions,
  cookieOptions,
  hasSaasAdminCookie,
} from "@/lib/auth-cookies";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

const SAAS_USER = process.env.SAAS_ADMIN_USER ?? "saas";
const SAAS_PASS = process.env.SAAS_ADMIN_PASSWORD ?? "saas123";

export const POST = withApiErrorHandling(async function POST(request: Request) {
  const body = (await request.json()) as { username?: string; password?: string };
  if (body.username !== SAAS_USER || body.password !== SAAS_PASS) {
    return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true, username: SAAS_USER });
  response.cookies.set(SAAS_COOKIE, "1", cookieOptions());
  return response;
});

export const GET = withApiErrorHandling(async function GET() {
  const jar = await cookies();
  const ok = hasSaasAdminCookie(jar.get(SAAS_COOKIE)?.value);
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, username: SAAS_USER });
});

export const DELETE = withApiErrorHandling(async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SAAS_COOKIE, "", clearCookieOptions());
  return response;
});
