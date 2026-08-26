import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function mapRow(row: {
  id: string;
  name: string;
  type: string;
  priceBase: number;
  priceSell: number;
  vatPct: number;
  validity: string;
  sharedUsers: number;
  bandwidthId: string;
  groupId: string;
  bandwidth: { name: string };
  group: { name: string };
}) {
  return {
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
  };
}

export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type");
  const rows = await prisma.plan.findMany({
    where: type ? { type } : undefined,
    include: { bandwidth: true, group: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ rows: rows.map(mapRow) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    type?: string;
    priceBase?: number;
    priceSell?: number;
    vatPct?: number;
    validity?: string;
    sharedUsers?: number;
    bandwidthId?: string;
    groupId?: string;
  };
  if (!body.name?.trim() || !body.bandwidthId || !body.groupId) {
    return NextResponse.json({ error: "Nama, bandwidth, dan grup wajib." }, { status: 400 });
  }
  const type = body.type === "hotspot" ? "hotspot" : "ppp";
  const [bw, group] = await Promise.all([
    prisma.bandwidth.findUnique({ where: { id: body.bandwidthId } }),
    prisma.profileGroup.findUnique({ where: { id: body.groupId } }),
  ]);
  if (!bw) return NextResponse.json({ error: "Bandwidth tidak ditemukan." }, { status: 404 });
  if (!group) return NextResponse.json({ error: "Grup tidak ditemukan." }, { status: 404 });
  try {
    const row = await prisma.plan.create({
      data: {
        name: body.name.trim(),
        type,
        priceBase: Number(body.priceBase) || 0,
        priceSell: Number(body.priceSell) || 0,
        vatPct: Number(body.vatPct) || 0,
        validity: body.validity?.trim() || "30 hari",
        sharedUsers: Math.max(1, Number(body.sharedUsers) || 1),
        bandwidthId: bw.id,
        groupId: group.id,
      },
      include: { bandwidth: true, group: true },
    });
    return NextResponse.json({ row: mapRow(row) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Nama paket sudah dipakai." }, { status: 409 });
  }
}
