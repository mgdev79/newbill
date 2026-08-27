import { NextResponse } from "next/server";
import { testRadiusEngineConnection } from "@/server/radius-engine";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

export const POST = withApiErrorHandling(async function POST(request: Request) {
  const body = (await request.json()) as {
    dbHost?: string;
    dbPort?: number;
    dbName?: string;
    dbUser?: string;
    dbPassword?: string;
    provisionMethod?: string;
    sshHost?: string;
    sshPort?: number;
    sshUser?: string;
    sshPrivateKey?: string;
  };

  if (!body.dbHost?.trim() || !body.dbUser?.trim() || !body.dbPassword) {
    return NextResponse.json(
      {
        ok: false,
        mysqlOk: false,
        sshOk: null,
        message: "Host, user, dan password MySQL wajib untuk tes koneksi.",
      },
      { status: 400 },
    );
  }

  const result = await testRadiusEngineConnection({
    dbHost: body.dbHost.trim(),
    dbPort: Number(body.dbPort) || 3306,
    dbName: body.dbName?.trim() || "radius",
    dbUser: body.dbUser.trim(),
    dbPassword: body.dbPassword,
    provisionMethod: body.provisionMethod === "ssh" ? "ssh" : "local",
    sshHost: body.sshHost,
    sshPort: body.sshPort,
    sshUser: body.sshUser,
    sshPrivateKey: body.sshPrivateKey,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
});
