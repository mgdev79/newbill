import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

export const GET = withApiErrorHandling(async function GET(request: Request) {
  const prisma = await getDb();
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
});

export const POST = withApiErrorHandling(async function POST(request: Request) {
  const prisma = await getDb();
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
});
