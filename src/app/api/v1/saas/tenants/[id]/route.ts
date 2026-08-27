import { NextResponse } from "next/server";
import { platformPrisma as prisma } from "@/lib/platform-db";
import { publicTenant, publicVpnAccount } from "@/lib/saas";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

export const GET = withApiErrorHandling(async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const row = await prisma.tenant.findUnique({
    where: { id },
    include: {
      plan: true,
      vpnAccounts: { include: { server: true }, orderBy: { label: "asc" } },
    },
  });
  if (!row) return NextResponse.json({ error: "Tenant tidak ditemukan." }, { status: 404 });
  return NextResponse.json({
    row: { ...publicTenant(row), vpnUsed: row.vpnAccounts.length },
    vpnAccounts: row.vpnAccounts.map(publicVpnAccount),
  });
});

export const PATCH = withApiErrorHandling(async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const existing = await prisma.tenant.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Tenant tidak ditemukan." }, { status: 404 });

  const body = (await request.json()) as Record<
    string,
    string | number | null | undefined
  >;

  const row = await prisma.tenant.update({
    where: { id },
    data: {
      ...(typeof body.name === "string" ? { name: body.name } : {}),
      ...(typeof body.email === "string" ? { email: body.email.toLowerCase() } : {}),
      ...(typeof body.password === "string" && body.password
        ? { password: body.password }
        : {}),
      ...(typeof body.phone === "string" ? { phone: body.phone } : {}),
      ...(typeof body.planId === "string" ? { planId: body.planId } : {}),
      ...(typeof body.status === "string" ? { status: body.status } : {}),
      ...(typeof body.billingUrl === "string" ? { billingUrl: body.billingUrl } : {}),
      ...(typeof body.radiusPublicIp === "string"
        ? { radiusPublicIp: body.radiusPublicIp }
        : {}),
      ...(typeof body.notes === "string" ? { notes: body.notes } : {}),
      ...(body.expiresAt !== undefined
        ? { expiresAt: body.expiresAt ? new Date(String(body.expiresAt)) : null }
        : {}),
      ...(body.activatedAt !== undefined
        ? {
            activatedAt: body.activatedAt
              ? new Date(String(body.activatedAt))
              : null,
          }
        : {}),
      ...(typeof body.requestId === "string" ? { requestId: body.requestId } : {}),
      ...(typeof body.hardwareId === "string" ? { hardwareId: body.hardwareId } : {}),
      ...(typeof body.softwareKey === "string"
        ? { softwareKey: body.softwareKey }
        : {}),
      ...(body.sessionLimit !== undefined
        ? {
            sessionLimit:
              body.sessionLimit === null || body.sessionLimit === ""
                ? null
                : Number(body.sessionLimit),
          }
        : {}),
    },
    include: { plan: true },
  });
  return NextResponse.json({ row: publicTenant(row) });
});

export const DELETE = withApiErrorHandling(async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  await prisma.vpnAccount.deleteMany({ where: { tenantId: id } });
  await prisma.tenant.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
});
