import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  activateOnly,
  ensureDefaultRadiusEngine,
  publicRadiusEngine,
  type RadiusEngineInput,
} from "@/server/radius-engine";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

function parseBody(body: RadiusEngineInput) {
  const provisionMethod = body.provisionMethod === "ssh" ? "ssh" : "local";
  return {
    name: body.name?.trim() || "default",
    dbHost: body.dbHost?.trim() || "",
    dbPort: Number(body.dbPort) > 0 ? Number(body.dbPort) : 3306,
    dbName: body.dbName?.trim() || "radius",
    dbUser: body.dbUser?.trim() || "",
    provisionMethod,
    sshHost: body.sshHost?.trim() || "",
    sshPort: Number(body.sshPort) > 0 ? Number(body.sshPort) : 22,
    sshUser: body.sshUser?.trim() || "root",
    provisionScript:
      body.provisionScript?.trim() || "/opt/radius-provision/gen_nas_listener.sh",
    useSudo: body.useSudo ?? true,
    coaPort: Number(body.coaPort) > 0 ? Number(body.coaPort) : 3799,
    publicIp: body.publicIp?.trim() || "",
    active: body.active ?? true,
  };
}

export const GET = withApiErrorHandling(async function GET() {
  const prisma = await getDb();
  await ensureDefaultRadiusEngine();
  const rows = await prisma.radiusEngine.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ rows: rows.map(publicRadiusEngine) });
});

export const POST = withApiErrorHandling(async function POST(request: Request) {
  const prisma = await getDb();
  const body = (await request.json()) as RadiusEngineInput;
  const data = parseBody(body);
  if (!data.dbHost || !data.dbUser) {
    return NextResponse.json({ error: "Host dan user MySQL wajib." }, { status: 400 });
  }
  if (!body.dbPassword?.trim()) {
    return NextResponse.json({ error: "Password MySQL wajib." }, { status: 400 });
  }
  if (data.provisionMethod === "ssh" && !data.sshHost) {
    return NextResponse.json({ error: "SSH host wajib jika method SSH." }, { status: 400 });
  }

  try {
    const row = await prisma.radiusEngine.create({
      data: {
        ...data,
        dbPassword: body.dbPassword,
        sshPrivateKey: body.sshPrivateKey ?? "",
      },
    });
    if (row.active) await activateOnly(row.id);
    const saved = await prisma.radiusEngine.findUniqueOrThrow({ where: { id: row.id } });
    return NextResponse.json({ row: publicRadiusEngine(saved) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Nama engine sudah dipakai." }, { status: 409 });
  }
});
