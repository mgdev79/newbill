import { NextResponse } from "next/server";
import { testMikrotikApi } from "@/server/mikrotik/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    ip?: string;
    apiPort?: number;
    apiUser?: string;
    apiPassword?: string;
    useSsl?: boolean;
    timeoutSec?: number;
  };

  if (!body.ip || !body.apiUser || !body.apiPassword) {
    return NextResponse.json(
      { ok: false, message: "IP, username API, dan password API wajib untuk tes koneksi." },
      { status: 400 },
    );
  }

  const result = await testMikrotikApi({
    host: body.ip,
    port: body.apiPort && Number.isFinite(body.apiPort) ? body.apiPort : 8728,
    user: body.apiUser,
    password: body.apiPassword,
    useSsl: Boolean(body.useSsl),
    timeoutMs: ((body.timeoutSec && Number.isFinite(body.timeoutSec) ? body.timeoutSec : 5) * 1000),
  });

  return NextResponse.json(result);
}
