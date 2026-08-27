import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  const existing = await prisma.staffUser.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
  const body = (await request.json()) as {
    password?: string;
    role?: string;
    topup?: boolean;
    balance?: number;
  };
  const row = await prisma.staffUser.update({
    where: { id },
    data: {
      ...(body.password ? { passwordHash: hashPassword(body.password) } : {}),
      ...(typeof body.role === "string" ? { role: body.role } : {}),
      ...(typeof body.topup === "boolean" ? { topup: body.topup } : {}),
      ...(body.balance !== undefined ? { balance: Number(body.balance) || 0 } : {}),
    },
  });
  return NextResponse.json({
    row: { id: row.id, username: row.username, role: row.role, topup: row.topup, balance: row.balance },
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  const row = await prisma.staffUser.findUnique({ where: { id } });
  if (row?.username === "admin") {
    return NextResponse.json({ error: "User admin tidak boleh dihapus." }, { status: 409 });
  }
  await prisma.staffUser.delete({ where: { id } }).catch(() => null);
  return new NextResponse(null, { status: 204 });
}
