import { statfs } from "node:fs/promises";
import os from "node:os";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCompanyProfile } from "@/lib/billing";
import { listLiveSessions } from "@/server/nas-online";
import { isFreeradiusConfigured } from "@/server/freeradius-db";

export const runtime = "nodejs";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

async function hostStats() {
  const total = os.totalmem();
  const free = os.freemem();
  const uptimeSec = os.uptime();
  const days = Math.floor(uptimeSec / 86400);
  const hours = Math.floor((uptimeSec % 86400) / 3600);
  let diskFreeGb: number | null = null;
  try {
    const disk = await statfs(process.platform === "win32" ? "C:/" : "/");
    diskFreeGb = Number((((disk.bavail * disk.bsize) / 1e9) as number).toFixed(2));
  } catch {
    diskFreeGb = null;
  }
  return {
    uptime: `${days} hari ${hours} jam`,
    ramTotalMb: Math.round(total / 1024 / 1024),
    ramFreeMb: Math.round(free / 1024 / 1024),
    diskFreeGb,
  };
}

export async function GET() {
  const today = startOfToday();
  const [
    sessions,
    unpaidInvoices,
    paidToday,
    hotspotUsers,
    pppoeUsers,
    vpnUsers,
    vouchers,
    vcCreatedToday,
    expVoucher,
    expCustomer,
    nasRows,
    company,
    host,
    radiusOk,
  ] = await Promise.all([
    listLiveSessions(),
    prisma.invoice.findMany({
      where: { status: "unpaid" },
      include: { customer: { select: { customerCode: true, name: true, owner: true } } },
      orderBy: { dueAt: "asc" },
      take: 20,
    }),
    prisma.invoice.aggregate({
      where: {
        status: "paid",
        OR: [
          { paidAt: { gte: today } },
          { AND: [{ paidAt: null }, { createdAt: { gte: today } }] },
        ],
      },
      _sum: { amount: true },
    }),
    prisma.customer.count({ where: { kind: "hotspot" } }),
    prisma.customer.count({ where: { kind: "ppp" } }),
    prisma.vpnAccount.count({ where: { enabled: true } }),
    prisma.voucher.count(),
    prisma.voucher.count({ where: { createdAt: { gte: today } } }),
    prisma.voucher.count({ where: { expiresAt: { lt: new Date() } } }),
    prisma.customer.count({
      where: { OR: [{ status: "isolated" }, { dueAt: { lt: new Date() } }] },
    }),
    prisma.nas.findMany({ orderBy: { name: "asc" } }),
    getCompanyProfile(),
    hostStats(),
    isFreeradiusConfigured(),
  ]);

  const pppOnline = sessions.filter((row) => row.kind === "ppp").length;
  const hotspotOnline = sessions.filter((row) => row.kind === "hotspot").length;
  const unpaidCount = await prisma.invoice.count({ where: { status: "unpaid" } });
  const nasHealthy = nasRows.filter((row) => row.healthy).length;
  const nasDown = nasRows.length - nasHealthy;

  return NextResponse.json({
    company,
    kpis: {
      incomeToday: paidToday._sum.amount ?? 0,
      unpaidCount,
      pppOnline,
      hotspotOnline,
    },
    host,
    summary: {
      hotspotUsers,
      pppoeUsers,
      vpnUsers,
      vouchers,
      vcCreatedToday,
      vcLoginToday: hotspotOnline,
      expVoucher,
      expCustomer,
    },
    serviceHealth: [
      { name: "Core Radius", status: radiusOk ? "ok" : "warn" },
      { name: "MikroTik", status: nasDown === 0 && nasRows.length > 0 ? "ok" : nasHealthy > 0 ? "warn" : "idle" },
      { name: "Session", status: pppOnline + hotspotOnline > 0 ? "ok" : "idle" },
      { name: "Pelanggan", status: pppoeUsers + hotspotUsers > 0 ? "ok" : "idle" },
      { name: "Voucher", status: vouchers > 0 ? "ok" : "idle" },
      {
        name: "Jatuh tempo",
        status: unpaidCount > 0 ? "warn" : "ok",
        detail: `${unpaidCount} invoice terbuka`,
      },
    ],
    unpaid: unpaidInvoices.map((row) => ({
      id: row.id,
      number: row.number,
      customerCode: row.customer.customerCode,
      name: row.customer.name,
      plan: row.planName,
      amount: row.amount,
      dueAt: row.dueAt.toISOString(),
      owner: row.customer.owner,
      status: row.status,
    })),
    nas: nasRows.map((row) => ({
      id: row.id,
      name: row.name,
      ip: row.ip,
      apiPort: row.apiPort,
      timezone: row.timezone,
      healthy: row.healthy,
    })),
    alerts: {
      isolated: expCustomer,
    },
  });
}
