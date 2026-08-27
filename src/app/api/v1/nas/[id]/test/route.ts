import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { testMikrotikApi } from "@/server/mikrotik/api";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

export const POST = withApiErrorHandling(async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  const row = await prisma.nas.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Router tidak ditemukan." }, { status: 404 });
  if (!row.apiPassword) {
    return NextResponse.json(
      { ok: false, message: "Password API belum disimpan. Isi di form ubah router." },
      { status: 400 },
    );
  }

  const result = await testMikrotikApi({
    host: row.ip,
    port: row.apiPort,
    user: row.apiUser,
    password: row.apiPassword,
    useSsl: row.useSsl,
    timeoutMs: (row.timeoutSec || 5) * 1000,
  });

  await prisma.nas.update({
    where: { id },
    data: {
      healthy: result.ok,
      lastSeenAt: result.ok ? new Date() : row.lastSeenAt,
      lastError: result.ok ? "" : result.message,
    },
  });

  return NextResponse.json(result);
});
