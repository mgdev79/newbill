import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

export const PATCH = withApiErrorHandling(async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Tiket tidak ditemukan." }, { status: 404 });
  const body = (await request.json()) as { status?: string; reply?: string; author?: string };
  if (body.reply?.trim()) {
    await prisma.ticketReply.create({
      data: {
        ticketId: id,
        message: body.reply.trim(),
        author: body.author?.trim() || "admin",
      },
    });
  }
  const row = await prisma.ticket.update({
    where: { id },
    data: {
      ...(body.status === "open" || body.status === "closed" ? { status: body.status } : {}),
    },
    include: { replies: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json({
    row: {
      ...row,
      createdAt: row.createdAt.toISOString(),
      replies: row.replies.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
    },
  });
});

export const DELETE = withApiErrorHandling(async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  await prisma.ticket.delete({ where: { id } }).catch(() => null);
  return new NextResponse(null, { status: 204 });
});
