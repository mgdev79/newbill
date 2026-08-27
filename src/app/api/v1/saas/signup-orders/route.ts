import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function publicOrder(row: {
  id: string;
  name: string;
  email: string;
  phone: string;
  subdomain: string;
  planId: string;
  planName: string;
  amount: number;
  paymentChannel: string;
  status: string;
  paymentRef: string;
  activatedTenantId: string;
  note: string;
  createdAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subdomain: row.subdomain,
    planId: row.planId,
    planName: row.planName,
    amount: row.amount,
    paymentChannel: row.paymentChannel,
    status: row.status,
    paymentRef: row.paymentRef,
    activatedTenantId: row.activatedTenantId,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET() {
  const rows = await prisma.tenantSignupOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ rows: rows.map(publicOrder) });
}
