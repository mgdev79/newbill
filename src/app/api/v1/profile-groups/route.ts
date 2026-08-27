import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

function mapRow(row: {
  id: string;
  name: string;
  type: string;
  pool: string;
  owner: string;
  nasId: string;
  nas: { name: string };
}) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    pool: row.pool,
    owner: row.owner,
    nasId: row.nasId,
    nas: row.nas.name,
  };
}

export const GET = withApiErrorHandling(async function GET(request: Request) {
  const prisma = await getDb();
  const type = new URL(request.url).searchParams.get("type");
  const rows = await prisma.profileGroup.findMany({
    where: type ? { type } : undefined,
    include: { nas: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ rows: rows.map(mapRow) });
});

export const POST = withApiErrorHandling(async function POST(request: Request) {
  const prisma = await getDb();
  const body = (await request.json()) as {
    name?: string;
    type?: string;
    nasId?: string;
    pool?: string;
    owner?: string;
  };
  if (!body.name?.trim() || !body.nasId || !body.pool?.trim()) {
    return NextResponse.json({ error: "Nama, NAS, dan pool wajib." }, { status: 400 });
  }
  const nas = await prisma.nas.findUnique({ where: { id: body.nasId } });
  if (!nas) return NextResponse.json({ error: "NAS tidak ditemukan." }, { status: 404 });
  const type = body.type === "hotspot" ? "hotspot" : "ppp";
  try {
    const row = await prisma.profileGroup.create({
      data: {
        name: body.name.trim(),
        type,
        nasId: nas.id,
        pool: body.pool.trim(),
        owner: body.owner?.trim() || "admin",
      },
      include: { nas: { select: { name: true } } },
    });
    return NextResponse.json({ row: mapRow(row) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Nama grup sudah dipakai." }, { status: 409 });
  }
});
