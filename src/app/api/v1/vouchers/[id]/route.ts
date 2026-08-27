import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { removeVoucherRadius, syncVoucherById } from "@/server/radius-hooks";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

export const PATCH = withApiErrorHandling(async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
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

  let radius: unknown = undefined;
  try {
    radius = await syncVoucherById(row.id);
  } catch (error) {
    radius = {
      radiusSync: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }

  return NextResponse.json({
    row: { id: row.id, code: row.code, enabled: row.enabled, owner: row.owner },
    radius,
  });
});

export const DELETE = withApiErrorHandling(async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  const existing = await prisma.voucher.findUnique({ where: { id } });
  await prisma.voucher.delete({ where: { id } }).catch(() => null);
  if (existing) {
    try {
      await removeVoucherRadius(existing.code);
    } catch (error) {
      console.error("[freeradius] hapus voucher:", error);
    }
  }
  return new NextResponse(null, { status: 204 });
});
