import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import {
  OPERATOR_COOKIE,
  OPERATOR_ENV_VALUE,
  clearCookieOptions,
  cookieOptions,
  hasOperatorCookie,
} from "@/lib/auth-cookies";

export const runtime = "nodejs";

const ENV_USER = process.env.OPERATOR_ADMIN_USER ?? "admin";
const ENV_PASS = process.env.OPERATOR_ADMIN_PASSWORD ?? "admin";

function setSession(response: NextResponse, value: string) {
  response.cookies.set(OPERATOR_COOKIE, value, cookieOptions());
  return response;
}

function envCredentialsMatch(username: string, password: string) {
  return username === ENV_USER && password === ENV_PASS && Boolean(ENV_USER) && Boolean(ENV_PASS);
}

export async function POST(request: Request) {
  const prisma = await getDb();
  const body = (await request.json()) as { username?: string; password?: string };
  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";
  if (!username || !password) {
    return NextResponse.json({ error: "Username dan password wajib." }, { status: 400 });
  }

  const staff = await prisma.staffUser.findUnique({ where: { username } });
  if (staff && verifyPassword(password, staff.passwordHash)) {
    return setSession(
      NextResponse.json({
        ok: true,
        username: staff.username,
        role: staff.role,
        source: "staff",
      }),
      staff.id,
    );
  }

  if (envCredentialsMatch(username, password)) {
    return setSession(
      NextResponse.json({
        ok: true,
        username: ENV_USER,
        role: "admin",
        source: "env",
      }),
      OPERATOR_ENV_VALUE,
    );
  }

  return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
}

export async function GET() {
  const prisma = await getDb();
  const jar = await cookies();
  const value = jar.get(OPERATOR_COOKIE)?.value;
  if (!hasOperatorCookie(value)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (value === OPERATOR_ENV_VALUE) {
    return NextResponse.json({
      ok: true,
      username: ENV_USER,
      role: "admin",
      source: "env",
    });
  }

  const staff = await prisma.staffUser.findUnique({ where: { id: value! } });
  if (!staff) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    username: staff.username,
    role: staff.role,
    source: "staff",
  });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(OPERATOR_COOKIE, "", clearCookieOptions());
  return response;
}
