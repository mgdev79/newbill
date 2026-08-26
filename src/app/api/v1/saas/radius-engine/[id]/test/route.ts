import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicRadiusEngine, testRadiusEngineConnection } from "@/server/radius-engine";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const row = await prisma.radiusEngine.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: "Engine tidak ditemukan." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    dbPassword?: string;
    sshPrivateKey?: string;
    dbHost?: string;
    dbPort?: number;
    dbName?: string;
    dbUser?: string;
    provisionMethod?: string;
    sshHost?: string;
    sshPort?: number;
    sshUser?: string;
  };

  const result = await testRadiusEngineConnection({
    dbHost: body.dbHost?.trim() || row.dbHost,
    dbPort: Number(body.dbPort) || row.dbPort,
    dbName: body.dbName?.trim() || row.dbName,
    dbUser: body.dbUser?.trim() || row.dbUser,
    dbPassword: body.dbPassword || row.dbPassword,
    provisionMethod: body.provisionMethod || row.provisionMethod,
    sshHost: body.sshHost ?? row.sshHost,
    sshPort: body.sshPort ?? row.sshPort,
    sshUser: body.sshUser ?? row.sshUser,
    sshPrivateKey: body.sshPrivateKey || row.sshPrivateKey,
  });

  const saved = await prisma.radiusEngine.update({
    where: { id },
    data: {
      lastTestOk: result.ok,
      lastTestAt: new Date(),
      lastTestError: result.ok ? "" : result.message,
    },
  });

  return NextResponse.json(
    { ...result, row: publicRadiusEngine(saved) },
    { status: result.ok ? 200 : 400 },
  );
}
