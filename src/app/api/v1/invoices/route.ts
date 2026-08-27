import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withApiErrorHandling } from "@/lib/api-handler";

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
  paidAt: Date | null;
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
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function paidAtRange(from?: string | null, to?: string | null) {
  const range = {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
  };
  return {
    OR: [
      { paidAt: range },
      { AND: [{ paidAt: null }, { createdAt: range }] },
    ],
  };
}

export const GET = withApiErrorHandling(async function GET(request: Request) {
  const prisma = await getDb();
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const paidFrom = url.searchParams.get("paidFrom");
  const paidTo = url.searchParams.get("paidTo");
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
      ...(paidFrom || paidTo ? paidAtRange(paidFrom, paidTo) : {}),
    },
    include: { customer: true },
    orderBy: { dueAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ rows: rows.map(mapRow) });
});
