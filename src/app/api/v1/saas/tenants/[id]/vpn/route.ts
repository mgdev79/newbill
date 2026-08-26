import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicVpnAccount } from "@/lib/saas";
import { randomSecret } from "@/lib/nas-script";
import { createPppSecret } from "@/server/mikrotik/ppp";

export const runtime = "nodejs";

/** Provision akun VPN tenant: tulis DB + buat /ppp/secret di MikroTik server pool. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: { plan: true, vpnAccounts: true },
  });
  if (!tenant) return NextResponse.json({ error: "Tenant tidak ditemukan." }, { status: 404 });
  if (tenant.vpnAccounts.length >= tenant.plan.vpnQuota) {
    return NextResponse.json(
      { error: `Kuota VPN paket habis (${tenant.plan.vpnQuota}).` },
      { status: 409 },
    );
  }

  const body = (await request.json()) as {
    label?: string;
    username?: string;
    password?: string;
    type?: string;
    serverId?: string;
    innerRadiusIp?: string;
    note?: string;
    /** Jika true, hanya tulis DB tanpa API MikroTik. Default: buat secret di router. */
    skipRouter?: boolean;
  };

  const server = body.serverId
    ? await prisma.vpnServer.findUnique({ where: { id: body.serverId } })
    : await prisma.vpnServer.findFirst({
        where: { online: true },
        orderBy: { name: "asc" },
      });

  if (!server) {
    return NextResponse.json(
      { error: "Belum ada VPN server. Tambah di menu VPN server." },
      { status: 400 },
    );
  }

  const username =
    body.username?.trim() ||
    `${tenant.code}${Math.floor(1000 + Math.random() * 9000)}@newbill.local`;
  const password = body.password || randomSecret(12);
  const type = body.type || "l2tp";
  const label = body.label?.trim() || `${tenant.code}-vpn`;

  let mikrotik: { ok: boolean; message: string } | null = null;

  if (!body.skipRouter) {
    if (!server.apiPassword) {
      return NextResponse.json(
        {
          error: `Server ${server.name} belum punya password API. Isi di VPN servers dulu.`,
        },
        { status: 400 },
      );
    }

    mikrotik = await createPppSecret(
      {
        host: server.host,
        port: server.apiPort,
        user: server.apiUser,
        password: server.apiPassword,
        useSsl: server.useSsl,
        timeoutMs: (server.timeoutSec || 5) * 1000,
      },
      {
        name: username,
        password,
        service: type === "pptp" ? "pptp" : type === "ovpn" ? "ovpn" : "l2tp",
        profile: "default",
        comment: `Newbill ${tenant.code} · ${label}`,
      },
    );

    if (!mikrotik.ok) {
      return NextResponse.json(
        {
          error: `Gagal buat secret di MikroTik (${server.host}): ${mikrotik.message}`,
          mikrotik,
        },
        { status: 502 },
      );
    }

    await prisma.vpnServer.update({
      where: { id: server.id },
      data: { online: true, lastSeenAt: new Date(), lastError: "" },
    });
  }

  const row = await prisma.vpnAccount.create({
    data: {
      label,
      username,
      password,
      type,
      innerRadiusIp: body.innerRadiusIp?.trim() || server.innerRadiusIp,
      note: body.note?.trim() || (mikrotik?.ok ? "created-on-router" : ""),
      tenantId: tenant.id,
      serverId: server.id,
      serverHost: server.host,
      enabled: true,
    },
    include: { server: true },
  });

  return NextResponse.json(
    { row: publicVpnAccount(row), mikrotik },
    { status: 201 },
  );
}
