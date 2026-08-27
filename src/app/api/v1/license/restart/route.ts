import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

/** Setara aksi RESTART Core Radius di Mixradius Info Lisensi. */
export async function POST() {
  const prisma = await getDb();
  await prisma.appSetting.upsert({
    where: { key: "core_radius_status" },
    create: { key: "core_radius_status", value: "running" },
    update: { value: "running" },
  });
  await prisma.appSetting.upsert({
    where: { key: "core_radius_restarted_at" },
    create: {
      key: "core_radius_restarted_at",
      value: new Date().toISOString(),
    },
    update: { value: new Date().toISOString() },
  });

  return NextResponse.json({
    ok: true,
    message: "Core Radius ditandai running (restart sinyal dicatat).",
    status: "running",
  });
}
