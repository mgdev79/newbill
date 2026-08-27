import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  const row = await prisma.voucherTemplate.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });
  return NextResponse.json({
    row: {
      id: row.id,
      name: row.name,
      accessBy: row.accessBy,
      enabled: row.enabled,
      html: row.html,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  const existing = await prisma.voucherTemplate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });
  }

  const body = (await request.json()) as {
    name?: string;
    accessBy?: string;
    html?: string;
    enabled?: boolean;
  };

  try {
    const row = await prisma.voucherTemplate.update({
      where: { id },
      data: {
        ...(typeof body.name === "string"
          ? { name: body.name.trim().replace(/\s+/g, "-") }
          : {}),
        ...(typeof body.accessBy === "string" ? { accessBy: body.accessBy } : {}),
        ...(typeof body.html === "string" ? { html: body.html } : {}),
        ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
      },
    });
    return NextResponse.json({
      row: {
        id: row.id,
        name: row.name,
        accessBy: row.accessBy,
        enabled: row.enabled,
        html: row.html,
      },
    });
  } catch {
    return NextResponse.json({ error: "Nama template bentrok." }, { status: 409 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  await prisma.voucherTemplate.delete({ where: { id } }).catch(() => null);
  return new NextResponse(null, { status: 204 });
}
