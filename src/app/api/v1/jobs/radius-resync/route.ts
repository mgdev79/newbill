import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  syncCustomerById,
  syncNasByRecord,
  syncVoucherById,
} from "@/server/radius-hooks";

export const runtime = "nodejs";

function authorized(request: Request) {
  const token = process.env.FREERADIUS_JOB_TOKEN?.trim();
  if (!token) return true;
  const header = request.headers.get("authorization");
  const query = new URL(request.url).searchParams.get("token");
  return header === `Bearer ${token}` || query === token;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nasRows = await prisma.nas.findMany();
  const customers = await prisma.customer.findMany({ select: { id: true } });
  const vouchers = await prisma.voucher.findMany({ select: { id: true } });
  const errors: string[] = [];

  for (const nas of nasRows) {
    try {
      await syncNasByRecord(nas);
    } catch (error) {
      errors.push(`nas ${nas.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  for (const row of customers) {
    try {
      await syncCustomerById(row.id);
    } catch (error) {
      errors.push(`customer ${row.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  for (const row of vouchers) {
    try {
      await syncVoucherById(row.id);
    } catch (error) {
      errors.push(`voucher ${row.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    nas: nasRows.length,
    customers: customers.length,
    vouchers: vouchers.length,
    errors,
  });
}
