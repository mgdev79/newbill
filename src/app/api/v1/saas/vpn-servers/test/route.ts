import { NextResponse } from "next/server";
import { testMikrotikApi } from "@/server/mikrotik/api";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

/** Tes koneksi API MikroTik sebelum/saat form tambah — tanpa menyimpan. */
export const POST = withApiErrorHandling(async function POST(request: Request) {
  const body = (await request.json()) as {
    host?: string;
    apiPort?: number;
    apiUser?: string;
    apiPassword?: string;
    useSsl?: boolean;
    timeoutSec?: number;
  };

  if (!body.host || !body.apiUser || !body.apiPassword) {
    return NextResponse.json(
      {
        ok: false,
        message: "Host, username API, dan password API wajib untuk tes koneksi.",
      },
      { status: 400 },
    );
  }

  const result = await testMikrotikApi({
    host: body.host.trim(),
    port: body.apiPort && Number.isFinite(body.apiPort) ? body.apiPort : 8728,
    user: body.apiUser.trim(),
    password: body.apiPassword,
    useSsl: Boolean(body.useSsl),
    timeoutMs:
      (body.timeoutSec && Number.isFinite(body.timeoutSec) ? body.timeoutSec : 5) * 1000,
  });

  return NextResponse.json(result);
});
