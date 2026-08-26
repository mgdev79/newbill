import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyGateToken } from "@/lib/member-captcha";

export const runtime = "nodejs";

const PAYMENT_CHANNELS = [
  { value: "ATM", label: "ATM Bersama" },
  { value: "BRI", label: "002 - Bank BRI" },
  { value: "BNI", label: "009 - Bank BNI" },
  { value: "BSI", label: "451 - Bank BSI" },
  { value: "MANDIRI", label: "008 - Bank Mandiri" },
  { value: "ALFAMART", label: "ALFAMART & POS" },
  { value: "QRIS", label: "QRIS [ Scan QR-Code ]" },
];

export async function GET() {
  const jar = await cookies();
  if (!verifyGateToken(jar.get("nb_evoucher_gate")?.value)) {
    return NextResponse.json({ error: "Sesi keamanan berakhir." }, { status: 401 });
  }

  const [plans, nasRows] = await Promise.all([
    prisma.plan.findMany({
      where: { type: "hotspot" },
      orderBy: { priceSell: "asc" },
      include: { bandwidth: true },
    }),
    prisma.nas.findMany({
      where: { enabled: true },
      select: { hotspotUrl: true, name: true },
    }),
  ]);

  const domains = Array.from(
    new Set(
      nasRows
        .map((row) => {
          const raw = row.hotspotUrl.trim();
          if (!raw) return "";
          try {
            const url = raw.includes("://") ? new URL(raw) : new URL(`http://${raw}`);
            return url.hostname;
          } catch {
            return raw.replace(/^https?:\/\//, "").split("/")[0] ?? "";
          }
        })
        .filter(Boolean),
    ),
  );

  return NextResponse.json({
    plans: plans.map((row) => ({
      id: row.id,
      name: row.name,
      priceSell: row.priceSell,
      validity: row.validity,
      sharedUsers: row.sharedUsers,
      bandwidth: `${row.bandwidth.maxDown}/${row.bandwidth.maxUp}`,
      duration: "Unlimited",
      quota: "Unlimited",
    })),
    domains,
    paymentChannels: PAYMENT_CHANNELS,
  });
}
