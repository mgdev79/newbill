import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function paidWhere(from?: Date, to?: Date) {
  const range = {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
  const hasRange = from || to;
  return {
    status: "paid",
    ...(hasRange
      ? {
          OR: [
            { paidAt: range },
            { AND: [{ paidAt: null }, { createdAt: range }] },
          ],
        }
      : {}),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
  const from = new Date(year, 0, 1);
  const to = new Date(year, 11, 31, 23, 59, 59);

  const [invoices, payouts] = await Promise.all([
    prisma.invoice.findMany({
      where: paidWhere(from, to),
      select: { amount: true, paidAt: true, createdAt: true },
    }),
    prisma.financePayout.findMany({
      where: { at: { gte: from, lte: to } },
      select: { amount: true, at: true },
    }),
  ]);

  const months = Array.from({ length: 12 }, (_, index) => ({
    month: MONTHS[index],
    income: 0,
    payout: 0,
  }));

  for (const row of invoices) {
    const at = row.paidAt ?? row.createdAt;
    if (at.getFullYear() !== year) continue;
    months[at.getMonth()].income += row.amount;
  }
  for (const row of payouts) {
    if (row.at.getFullYear() !== year) continue;
    months[row.at.getMonth()].payout += row.amount;
  }

  const omzet = months.reduce((sum, row) => sum + row.income, 0);
  return NextResponse.json({
    year,
    months,
    omzet,
    bhpEstimate: Math.round(omzet * 0.005),
    usoEstimate: Math.round(omzet * 0.0125),
    disclaimer:
      "BHP 0.5% dan USO 1.25% adalah estimasi placeholder, bukan rumus resmi Kominfo.",
  });
}
