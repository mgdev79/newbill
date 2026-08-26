import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  activateOnly,
  publicRadiusEngine,
  type RadiusEngineInput,
} from "@/server/radius-engine";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const existing = await prisma.radiusEngine.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Engine tidak ditemukan." }, { status: 404 });
  }

  const body = (await request.json()) as RadiusEngineInput;
  try {
    const row = await prisma.radiusEngine.update({
      where: { id },
      data: {
        ...(typeof body.name === "string" && body.name.trim() ? { name: body.name.trim() } : {}),
        ...(typeof body.dbHost === "string" ? { dbHost: body.dbHost.trim() } : {}),
        ...(typeof body.dbPort === "number" && Number.isFinite(body.dbPort)
          ? { dbPort: body.dbPort }
          : {}),
        ...(typeof body.dbName === "string" && body.dbName.trim()
          ? { dbName: body.dbName.trim() }
          : {}),
        ...(typeof body.dbUser === "string" ? { dbUser: body.dbUser.trim() } : {}),
        ...(typeof body.dbPassword === "string" && body.dbPassword.length > 0
          ? { dbPassword: body.dbPassword }
          : {}),
        ...(body.provisionMethod === "ssh" || body.provisionMethod === "local"
          ? { provisionMethod: body.provisionMethod }
          : {}),
        ...(typeof body.sshHost === "string" ? { sshHost: body.sshHost.trim() } : {}),
        ...(typeof body.sshPort === "number" && Number.isFinite(body.sshPort)
          ? { sshPort: body.sshPort }
          : {}),
        ...(typeof body.sshUser === "string" ? { sshUser: body.sshUser.trim() } : {}),
        ...(typeof body.sshPrivateKey === "string" && body.sshPrivateKey.length > 0
          ? { sshPrivateKey: body.sshPrivateKey }
          : {}),
        ...(typeof body.provisionScript === "string"
          ? { provisionScript: body.provisionScript.trim() }
          : {}),
        ...(typeof body.useSudo === "boolean" ? { useSudo: body.useSudo } : {}),
        ...(typeof body.coaPort === "number" && Number.isFinite(body.coaPort)
          ? { coaPort: body.coaPort }
          : {}),
        ...(typeof body.publicIp === "string" ? { publicIp: body.publicIp.trim() } : {}),
        ...(typeof body.active === "boolean" ? { active: body.active } : {}),
      },
    });
    if (row.active) await activateOnly(row.id);
    const saved = await prisma.radiusEngine.findUniqueOrThrow({ where: { id } });
    return NextResponse.json({ row: publicRadiusEngine(saved) });
  } catch {
    return NextResponse.json({ error: "Nama engine sudah dipakai." }, { status: 409 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  await prisma.radiusEngine.delete({ where: { id } }).catch(() => null);
  return new NextResponse(null, { status: 204 });
}
