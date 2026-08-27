import { NextResponse } from "next/server";
import { platformPrisma as prisma } from "@/lib/platform-db";
import { testMikrotikApi } from "@/server/mikrotik/api";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

export const POST = withApiErrorHandling(async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const row = await prisma.vpnServer.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: "Server tidak ditemukan." }, { status: 404 });
  }
  if (!row.apiPassword) {
    return NextResponse.json(
      {
        ok: false,
        message: "Password API MikroTik belum disimpan. Isi di form ubah server.",
      },
      { status: 400 },
    );
  }

  const result = await testMikrotikApi({
    host: row.host,
    port: row.apiPort,
    user: row.apiUser,
    password: row.apiPassword,
    useSsl: row.useSsl,
    timeoutMs: (row.timeoutSec || 5) * 1000,
  });

  await prisma.vpnServer.update({
    where: { id },
    data: {
      online: result.ok ? true : row.online,
      lastSeenAt: result.ok ? new Date() : row.lastSeenAt,
      lastError: result.ok ? "" : result.message,
    },
  });

  return NextResponse.json(result);
});
