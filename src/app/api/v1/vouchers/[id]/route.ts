import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    enabled?: boolean;
    owner?: string;
    bindOnLogin?: boolean;
  };

  const existing = await prisma.voucher.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Voucher tidak ditemukan." }, { status: 404 });
  }

  const row = await prisma.voucher.update({
    where: { id },
    data: {
      ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
      ...(typeof body.owner === "string" ? { owner: body.owner.trim() } : {}),
      ...(typeof body.bindOnLogin === "boolean"
        ? { bindOnLogin: body.bindOnLogin }
        : {}),
    },
  });

  return NextResponse.json({
    row: { id: row.id, code: row.code, enabled: row.enabled, owner: row.owner },
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  await prisma.voucher.delete({ where: { id } }).catch(() => null);
  return new NextResponse(null, { status: 204 });
}
