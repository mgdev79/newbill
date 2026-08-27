import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyGateToken } from "@/lib/member-captcha";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

export const POST = withApiErrorHandling(async function POST(request: Request) {
  const prisma = await getDb();
  const jar = await cookies();
  if (!verifyGateToken(jar.get("nb_evoucher_gate")?.value)) {
    return NextResponse.json({ error: "Sesi keamanan berakhir." }, { status: 401 });
  }

  const body = (await request.json()) as { code?: string };
  const code = (body.code ?? "").trim();
  if (!code) {
    return NextResponse.json({ error: "Kode voucher wajib." }, { status: 400 });
  }

  const voucher = await prisma.voucher.findFirst({
    where: {
      OR: [{ code }, { code: code.toUpperCase() }],
    },
    include: {
      plan: true,
      nas: { select: { name: true, hotspotUrl: true } },
    },
  });

  if (!voucher) {
    return NextResponse.json({ error: "Voucher tidak ditemukan." }, { status: 404 });
  }

  const expired = new Date(voucher.expiresAt).getTime() < Date.now();

  return NextResponse.json({
    row: {
      code: voucher.code,
      planName: voucher.plan.name,
      validity: voucher.plan.validity,
      priceSell: voucher.plan.priceSell,
      enabled: voucher.enabled,
      used: voucher.used,
      expired,
      expiresAt: voucher.expiresAt.toISOString(),
      nas: voucher.nas.name,
      hotspotUrl: voucher.nas.hotspotUrl,
      status: !voucher.enabled
        ? "disabled"
        : expired
          ? "expired"
          : voucher.used
            ? "used"
            : "ready",
    },
  });
});
