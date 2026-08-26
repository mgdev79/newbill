import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  await prisma.evoucherOrder.delete({ where: { id } }).catch(() => null);
  return new NextResponse(null, { status: 204 });
}
