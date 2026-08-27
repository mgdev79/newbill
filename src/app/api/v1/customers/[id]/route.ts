import { NextResponse } from "next/server";
import { getCompanyProfile } from "@/lib/billing";
import { getDb } from "@/lib/db";
import { removeRadiusUsername } from "@/server/freeradius-sync";
import { syncCustomerById } from "@/server/radius-hooks";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Pelanggan tidak ditemukan." }, { status: 404 });
  }

  const body = (await request.json()) as Record<string, string | boolean | number | undefined>;

  try {
    const row = await prisma.customer.update({
      where: { id },
      data: {
        ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
        ...(typeof body.customerCode === "string" && body.customerCode.trim()
          ? { customerCode: body.customerCode.trim() }
          : {}),
        ...(typeof body.username === "string" ? { username: body.username.trim() } : {}),
        ...(typeof body.password === "string" && body.password
          ? { password: body.password }
          : {}),
        ...(typeof body.phone === "string" ? { phone: body.phone } : {}),
        ...(typeof body.email === "string" ? { email: body.email } : {}),
        ...(typeof body.address === "string" ? { address: body.address } : {}),
        ...(typeof body.identityNumber === "string"
          ? { identityNumber: body.identityNumber }
          : {}),
        ...(typeof body.note === "string" ? { note: body.note } : {}),
        ...(typeof body.serviceType === "string"
          ? { serviceType: body.serviceType }
          : {}),
        ...(typeof body.payMode === "string" ? { payMode: body.payMode } : {}),
        ...(typeof body.status === "string" ? { status: body.status } : {}),
        ...(typeof body.nasId === "string" ? { nasId: body.nasId } : {}),
        ...(typeof body.planId === "string" ? { planId: body.planId } : {}),
        ...(typeof body.odp === "string" ? { odp: body.odp } : {}),
        ...(typeof body.latitude === "string" ? { latitude: body.latitude.trim() } : {}),
        ...(typeof body.longitude === "string" ? { longitude: body.longitude.trim() } : {}),
        ...(typeof body.ip === "string" ? { ip: body.ip } : {}),
        ...(typeof body.bindOnLogin === "boolean"
          ? { bindOnLogin: body.bindOnLogin }
          : {}),
        ...(typeof body.owner === "string" ? { owner: body.owner } : {}),
        ...(typeof body.dueAt === "string" && body.dueAt
          ? { dueAt: new Date(body.dueAt) }
          : {}),
      },
      include: { plan: true, nas: true },
    });
    let radius: unknown = undefined;
    try {
      radius = await syncCustomerById(row.id, {
        previousUsername: existing.username,
        disconnectIfBlocked: true,
      });
    } catch (error) {
      radius = {
        radiusSync: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
    return NextResponse.json({
      row: {
        id: row.id,
        customerCode: row.customerCode,
        name: row.name,
        username: row.username,
        plan: row.plan.name,
        planId: row.planId,
        nas: row.nas.name,
        nasId: row.nasId,
        status: row.status,
        kind: row.kind,
      },
      radius,
    });
  } catch {
    return NextResponse.json(
      { error: "Username atau ID pelanggan bentrok." },
      { status: 409 },
    );
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  const url = new URL(request.url);
  const withReceipt = url.searchParams.get("receipt") === "1";

  const row = await prisma.customer.findUnique({
    where: { id },
    include: {
      plan: true,
      nas: true,
      invoices: withReceipt
        ? { orderBy: { createdAt: "desc" }, take: 1 }
        : false,
    },
  });
  if (!row) {
    return NextResponse.json({ error: "Pelanggan tidak ditemukan." }, { status: 404 });
  }

  const base = {
    id: row.id,
    customerCode: row.customerCode,
    name: row.name,
    username: row.username,
    password: row.password,
    phone: row.phone,
    email: row.email,
    address: row.address,
    identityNumber: row.identityNumber,
    note: row.note,
    serviceType: row.serviceType,
    plan: row.plan.name,
    planId: row.planId,
    ip: row.ip,
    dueAt: row.dueAt.toISOString(),
    renewedAt: row.renewedAt?.toISOString() ?? null,
    owner: row.owner,
    status: row.status,
    payMode: row.payMode,
    trxStatus: row.trxStatus,
    subscriptionType: row.subscriptionType,
    nas: row.nas.name,
    nasId: row.nasId,
    odp: row.odp,
    bindOnLogin: row.bindOnLogin,
    mac: row.boundMac,
    kind: row.kind,
  };

  if (!withReceipt) {
    return NextResponse.json({ row: base });
  }

  const invoice = row.invoices[0]
    ? {
        id: row.invoices[0].id,
        number: row.invoices[0].number,
        planName: row.invoices[0].planName,
        planNote: row.invoices[0].planNote,
        periodLabel: row.invoices[0].periodLabel,
        amount: row.invoices[0].amount,
        subTotal: row.invoices[0].subTotal,
        taxAmount: row.invoices[0].taxAmount,
        deviceFee: row.invoices[0].deviceFee,
        dueAt: row.invoices[0].dueAt.toISOString(),
        status: row.invoices[0].status,
        method: row.invoices[0].method,
        payMode: row.invoices[0].payMode,
        subscriptionType: row.invoices[0].subscriptionType,
        createdAt: row.invoices[0].createdAt.toISOString(),
      }
    : null;

  const company = await getCompanyProfile();
  return NextResponse.json({ row: base, invoice, company });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getDb();
  const { id } = await context.params;
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Pelanggan tidak ditemukan." }, { status: 404 });
  }
  await prisma.customer.delete({ where: { id } });
  try {
    await removeRadiusUsername(existing.username);
  } catch (error) {
    return NextResponse.json(
      {
        ok: true,
        radius: {
          radiusSync: "error",
          message: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 200 },
    );
  }
  return new NextResponse(null, { status: 204 });
}
