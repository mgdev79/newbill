import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params;
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (!row) return NextResponse.json({ key, value: "" });
  return NextResponse.json({ key: row.key, value: row.value });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params;
  const body = (await request.json()) as { value?: string };
  const value = body.value ?? "";
  const row = await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  return NextResponse.json({ key: row.key, value: row.value });
}
