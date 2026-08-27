import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

const KINDS = new Set(["login", "activity", "bg", "whatsapp"]);

function mapRow(row: { id: string; at: Date; actor: string; message: string; kind: string }) {
  return {
    id: row.id,
    at: row.at.toISOString(),
    actor: row.actor,
    message: row.message,
    kind: row.kind,
  };
}

export async function GET(request: Request) {
  const prisma = await getDb();
  const kind = new URL(request.url).searchParams.get("kind") ?? "";
  if (!KINDS.has(kind)) {
    return NextResponse.json({ error: "kind wajib: login|activity|bg|whatsapp." }, { status: 400 });
  }
  const rows = await prisma.activityLog.findMany({
    where: { kind },
    orderBy: { at: "desc" },
    take: 300,
  });
  return NextResponse.json({ rows: rows.map(mapRow) });
}

export async function POST(request: Request) {
  const prisma = await getDb();
  const body = (await request.json()) as { kind?: string; actor?: string; message?: string };
  if (!body.kind || !KINDS.has(body.kind)) {
    return NextResponse.json({ error: "kind wajib: login|activity|bg|whatsapp." }, { status: 400 });
  }
  if (!body.message?.trim()) {
    return NextResponse.json({ error: "Pesan wajib." }, { status: 400 });
  }
  const row = await prisma.activityLog.create({
    data: {
      kind: body.kind,
      actor: body.actor?.trim() || "system",
      message: body.message.trim(),
    },
  });
  return NextResponse.json({ row: mapRow(row) }, { status: 201 });
}
