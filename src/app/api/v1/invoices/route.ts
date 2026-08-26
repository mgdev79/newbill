import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function mapRow(row: {
  id: string;
  number: string;
  planName: string;
  amount: number;
  dueAt: Date;
  status: string;
  method: string;
  payMode: string;
  createdAt: Date;
  customer: { customerCode: string; name: string; owner: string; serviceType: string };
}) {
  return {
    id: row.id,
    number: row.number,
    customerCode: row.customer.customerCode,
    name: row.customer.name,
    serviceType: row.customer.serviceType,
    plan: row.planName,
    amount: row.amount,
    dueAt: row.dueAt.toISOString(),
    owner: row.customer.owner,
    status: row.status,
    method: row.method,
    payMode: row.payMode,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const rows = await prisma.invoice.findMany({
    where: {
      ...(status && status !== "all" ? { status } : {}),
      ...(from || to
        ? {
            dueAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
            },
          }
        : {}),
    },
    include: { customer: true },
    orderBy: { dueAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ rows: rows.map(mapRow) });
}
