import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { resyncUsersOnPlan } from "@/server/radius-hooks";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

export const PATCH = withApiErrorHandling(async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  const existing = await prisma.plan.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });
  }
  const body = (await request.json()) as Record<string, string | number | undefined>;
  try {
    const row = await prisma.plan.update({
      where: { id },
      data: {
        ...(typeof body.name === "string" && body.name.trim() ? { name: body.name.trim() } : {}),
        ...(body.type === "ppp" || body.type === "hotspot" ? { type: body.type } : {}),
        ...(typeof body.priceBase === "number" || typeof body.priceBase === "string"
          ? { priceBase: Number(body.priceBase) || 0 }
          : {}),
        ...(typeof body.priceSell === "number" || typeof body.priceSell === "string"
          ? { priceSell: Number(body.priceSell) || 0 }
          : {}),
        ...(typeof body.vatPct === "number" || typeof body.vatPct === "string"
          ? { vatPct: Number(body.vatPct) || 0 }
          : {}),
        ...(typeof body.validity === "string" ? { validity: body.validity.trim() } : {}),
        ...(typeof body.sharedUsers === "number" || typeof body.sharedUsers === "string"
          ? { sharedUsers: Math.max(1, Number(body.sharedUsers) || 1) }
          : {}),
        ...(typeof body.bandwidthId === "string" ? { bandwidthId: body.bandwidthId } : {}),
        ...(typeof body.groupId === "string" ? { groupId: body.groupId } : {}),
      },
      include: { bandwidth: true, group: true },
    });
    await resyncUsersOnPlan(id);
    return NextResponse.json({
      row: {
        id: row.id,
        name: row.name,
        type: row.type,
        priceBase: row.priceBase,
        priceSell: row.priceSell,
        vatPct: row.vatPct,
        validity: row.validity,
        sharedUsers: row.sharedUsers,
        bandwidthId: row.bandwidthId,
        groupId: row.groupId,
        bandwidth: row.bandwidth.name,
        group: row.group.name,
      },
    });
  } catch {
    return NextResponse.json({ error: "Nama paket bentrok." }, { status: 409 });
  }
});

export const DELETE = withApiErrorHandling(async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  const [customers, vouchers] = await Promise.all([
    prisma.customer.count({ where: { planId: id } }),
    prisma.voucher.count({ where: { planId: id } }),
  ]);
  if (customers + vouchers > 0) {
    return NextResponse.json(
      { error: "Paket masih dipakai pelanggan atau voucher." },
      { status: 409 },
    );
  }
  await prisma.plan.delete({ where: { id } }).catch(() => null);
  return new NextResponse(null, { status: 204 });
});
