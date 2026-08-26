import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const prefix = url.searchParams.get("prefix") ?? "";
  const keys = url.searchParams.get("keys");
  const rows = keys
    ? await prisma.appSetting.findMany({
        where: { key: { in: keys.split(",").map((item) => item.trim()).filter(Boolean) } },
      })
    : prefix
      ? await prisma.appSetting.findMany({ where: { key: { startsWith: prefix } } })
      : await prisma.appSetting.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json({
    rows: rows.map((row) => ({ key: row.key, value: row.value })),
  });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { entries?: Record<string, string>; key?: string; value?: string };
  const entries = body.entries ?? (body.key ? { [body.key]: body.value ?? "" } : null);
  if (!entries || !Object.keys(entries).length) {
    return NextResponse.json({ error: "entries wajib." }, { status: 400 });
  }
  for (const [key, value] of Object.entries(entries)) {
    if (!key.trim()) continue;
    await prisma.appSetting.upsert({
      where: { key: key.trim() },
      update: { value: String(value ?? "") },
      create: { key: key.trim(), value: String(value ?? "") },
    });
  }
  return NextResponse.json({ ok: true });
}
