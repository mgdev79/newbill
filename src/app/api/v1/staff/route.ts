import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

function publicStaff(row: {
  id: string;
  username: string;
  role: string;
  topup: boolean;
  balance: number;
}) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    topup: row.topup,
    balance: row.balance,
  };
}

export async function GET() {
  let rows = await prisma.staffUser.findMany({ orderBy: { username: "asc" } });
  if (!rows.length) {
    const created = await prisma.staffUser.create({
      data: {
        username: "admin",
        passwordHash: hashPassword("admin"),
        role: "admin",
      },
    });
    rows = [created];
  }
  return NextResponse.json({ rows: rows.map(publicStaff) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
    role?: string;
    topup?: boolean;
    balance?: number;
  };
  if (!body.username?.trim() || !body.password) {
    return NextResponse.json({ error: "Username dan password wajib." }, { status: 400 });
  }
  try {
    const row = await prisma.staffUser.create({
      data: {
        username: body.username.trim(),
        passwordHash: hashPassword(body.password),
        role: body.role || "operator",
        topup: Boolean(body.topup),
        balance: Number(body.balance) || 0,
      },
    });
    return NextResponse.json({ row: publicStaff(row) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Username sudah dipakai." }, { status: 409 });
  }
}
