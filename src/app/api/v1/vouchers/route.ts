import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generateVoucherCode,
  parseValidityToExpiry,
  randomBatchId,
  type CodeCombination,
} from "@/lib/voucher-code";

export const runtime = "nodejs";

function mapRow(row: {
  id: string;
  code: string;
  password: string;
  kind: string;
  serviceType: string;
  owner: string;
  enabled: boolean;
  used: boolean;
  bindOnLogin: boolean;
  loginMethod: string;
  sellerFee: number;
  prefix: string;
  batchId: string;
  createdAt: Date;
  expiresAt: Date;
  boundMac: string;
  nasId: string;
  planId: string;
  plan: { name: string; priceSell: number };
  nas: { name: string };
}) {
  return {
    id: row.id,
    code: row.code,
    password: row.password,
    kind: row.kind,
    serviceType: row.serviceType,
    plan: row.plan.name,
    planId: row.planId,
    priceSell: row.plan.priceSell,
    owner: row.owner,
    enabled: row.enabled,
    used: row.used,
    bindOnLogin: row.bindOnLogin,
    loginMethod: row.loginMethod,
    sellerFee: row.sellerFee,
    prefix: row.prefix,
    batchId: row.batchId,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    nas: row.nas.name,
    nasId: row.nasId,
    mac: row.boundMac,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const rows = await prisma.voucher.findMany({
    where: kind ? { kind } : undefined,
    include: { plan: true, nas: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ rows: rows.map(mapRow) });
}

/**
 * Generate batch voucher (Mixradius: POST /rad-vouchers/voucher-post).
 */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    kind?: string;
    nasId?: string;
    planId?: string;
    owner?: string;
    bindOnLogin?: boolean;
    loginMethod?: string;
    sellerFee?: number;
    qty?: number;
    length?: number;
    prefix?: string;
    combination?: CodeCombination;
    serviceType?: string;
  };

  const kind = body.kind === "ppp" ? "ppp" : "hotspot";
  const qty = Math.min(Math.max(Number(body.qty) || 1, 1), 200);
  const length = Math.min(Math.max(Number(body.length) || 6, 4), 24);
  const prefix = (body.prefix ?? "").trim();
  const combination = (body.combination as CodeCombination) || "type1";
  const loginMethod =
    body.loginMethod === "username_and_password"
      ? "username_and_password"
      : "voucher_code";

  if (!body.nasId || !body.planId) {
    return NextResponse.json({ error: "NAS dan paket wajib." }, { status: 400 });
  }

  const [nas, plan] = await Promise.all([
    prisma.nas.findUnique({ where: { id: body.nasId } }),
    prisma.plan.findUnique({ where: { id: body.planId } }),
  ]);
  if (!nas) return NextResponse.json({ error: "NAS tidak ditemukan." }, { status: 404 });
  if (!plan) return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });

  const batchId = randomBatchId();
  const expiresAt = parseValidityToExpiry(plan.validity);
  const created: ReturnType<typeof mapRow>[] = [];
  const errors: string[] = [];

  for (let i = 0; i < qty; i += 1) {
    let code = "";
    let attempts = 0;
    while (attempts < 8) {
      code = generateVoucherCode(length, combination, prefix);
      const exists = await prisma.voucher.findUnique({ where: { code } });
      if (!exists) break;
      attempts += 1;
    }
    if (!code) {
      errors.push(`Gagal unik di item ${i + 1}`);
      continue;
    }

    const password =
      loginMethod === "voucher_code"
        ? code
        : generateVoucherCode(Math.max(4, Math.floor(length / 2)), combination);

    try {
      const row = await prisma.voucher.create({
        data: {
          code,
          password,
          kind,
          serviceType:
            body.serviceType?.trim() ||
            (kind === "hotspot" ? "hotspot" : "pppoe"),
          owner: body.owner?.trim() || "admin",
          bindOnLogin: Boolean(body.bindOnLogin),
          loginMethod,
          sellerFee: Number(body.sellerFee) || 0,
          prefix,
          batchId,
          expiresAt,
          nasId: nas.id,
          planId: plan.id,
          enabled: true,
          used: false,
        },
        include: { plan: true, nas: true },
      });
      created.push(mapRow(row));
    } catch {
      errors.push(`Bentrok kode ${code}`);
    }
  }

  if (!created.length) {
    return NextResponse.json(
      { error: "Tidak ada voucher yang berhasil dibuat.", errors },
      { status: 409 },
    );
  }

  return NextResponse.json(
    { rows: created, batchId, count: created.length, errors },
    { status: 201 },
  );
}
