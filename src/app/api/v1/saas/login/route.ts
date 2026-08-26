import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export const SAAS_COOKIE = "nb_saas_admin";

const SAAS_USER = process.env.SAAS_ADMIN_USER ?? "saas";
const SAAS_PASS = process.env.SAAS_ADMIN_PASSWORD ?? "saas123";

export async function POST(request: Request) {
  const body = (await request.json()) as { username?: string; password?: string };
  if (body.username !== SAAS_USER || body.password !== SAAS_PASS) {
    return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true, username: SAAS_USER });
  response.cookies.set(SAAS_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}

export async function GET() {
  const jar = await cookies();
  const ok = jar.get(SAAS_COOKIE)?.value === "1";
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, username: SAAS_USER });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SAAS_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
