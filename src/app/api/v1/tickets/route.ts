import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const status = new URL(request.url).searchParams.get("status");
  const rows = await prisma.ticket.findMany({
    where: status ? { status } : undefined,
    include: { replies: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    rows: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      replies: row.replies.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    })),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { subject?: string; customer?: string; body?: string };
  if (!body.subject?.trim()) {
    return NextResponse.json({ error: "Subjek wajib." }, { status: 400 });
  }
  const row = await prisma.ticket.create({
    data: {
      subject: body.subject.trim(),
      customer: body.customer?.trim() ?? "",
      body: body.body?.trim() ?? "",
    },
    include: { replies: true },
  });
  return NextResponse.json({ row: { ...row, createdAt: row.createdAt.toISOString() } }, { status: 201 });
}
