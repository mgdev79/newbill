import { NextResponse } from "next/server";
import {
  getCompanyProfile,
  makeInvoiceNumber,
  makeMemberId,
  splitInclusiveTax,
} from "@/lib/billing";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function mapCustomer(row: {
  id: string;
  customerCode: string;
  name: string;
  username: string;
  password: string;
  phone: string;
  email: string;
  address: string;
  identityNumber: string;
  note: string;
  portalPassword: string;
  serviceType: string;
  kind: string;
  ip: string;
  localAddress: string;
  ipAddressType: string;
  dueAt: Date;
  renewedAt: Date | null;
  owner: string;
  status: string;
  payMode: string;
  trxStatus: string;
  subscriptionType: string;
  expiredAction: string;
  discount: number;
  sellerFee: number;
  setupFee: number;
  deviceFee: number;
  applyTax: boolean;
  latitude: string;
  longitude: string;
  odp: string;
  bindOnLogin: boolean;
  boundMac: string;
  nasId: string;
  planId: string;
  plan: { name: string; priceSell: number; vatPct: number; validity: string };
  nas: { name: string };
}) {
  return {
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
    portalPassword: row.portalPassword,
    serviceType: row.serviceType,
    plan: row.plan.name,
    planId: row.planId,
    planPrice: row.plan.priceSell,
    planVatPct: row.plan.vatPct,
    planValidity: row.plan.validity,
    ip: row.ip,
    localAddress: row.localAddress,
    ipAddressType: row.ipAddressType,
    dueAt: row.dueAt.toISOString(),
    renewedAt: row.renewedAt?.toISOString() ?? null,
    owner: row.owner,
    status: row.status,
    payMode: row.payMode,
    trxStatus: row.trxStatus,
    subscriptionType: row.subscriptionType,
    expiredAction: row.expiredAction,
    discount: row.discount,
    sellerFee: row.sellerFee,
    setupFee: row.setupFee,
    deviceFee: row.deviceFee,
    applyTax: row.applyTax,
    latitude: row.latitude,
    longitude: row.longitude,
    nas: row.nas.name,
    nasId: row.nasId,
    odp: row.odp,
    bindOnLogin: row.bindOnLogin,
    mac: row.boundMac,
    kind: row.kind,
  };
}

function mapInvoice(inv: {
  id: string;
  number: string;
  planName: string;
  planNote: string;
  periodLabel: string;
  amount: number;
  subTotal: number;
  taxAmount: number;
  deviceFee: number;
  dueAt: Date;
  status: string;
  method: string;
  payMode: string;
  subscriptionType: string;
  createdAt: Date;
}) {
  return {
    id: inv.id,
    number: inv.number,
    planName: inv.planName,
    planNote: inv.planNote,
    periodLabel: inv.periodLabel,
    amount: inv.amount,
    subTotal: inv.subTotal,
    taxAmount: inv.taxAmount,
    deviceFee: inv.deviceFee,
    dueAt: inv.dueAt.toISOString(),
    status: inv.status,
    method: inv.method,
    payMode: inv.payMode,
    subscriptionType: inv.subscriptionType,
    createdAt: inv.createdAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const rows = await prisma.customer.findMany({
    where: kind ? { kind } : undefined,
    include: { plan: true, nas: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ rows: rows.map(mapCustomer) });
}

/**
 * Alur Mixradius: POST tambah pelanggan → buat invoice (paid/unpaid) → receipt UI.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    kind?: string;
    name?: string;
    customerCode?: string;
    username?: string;
    password?: string;
    phone?: string;
    email?: string;
    address?: string;
    identityNumber?: string;
    note?: string;
    portalPassword?: string;
    serviceType?: string;
    payMode?: string;
    status?: string;
    trxStatus?: string;
    subscriptionType?: string;
    expiredAction?: string;
    nasId?: string;
    planId?: string;
    odp?: string;
    ip?: string;
    localAddress?: string;
    ipAddressType?: string;
    bindOnLogin?: boolean;
    owner?: string;
    dueAt?: string;
    discount?: number;
    sellerFee?: number;
    setupFee?: number;
    deviceFee?: number;
    applyTax?: boolean;
    latitude?: string;
    longitude?: string;
  };

  if (!body.name?.trim() || !body.username?.trim() || !body.password?.trim()) {
    return NextResponse.json(
      { error: "Nama, username, dan password wajib." },
      { status: 400 },
    );
  }
  if (!body.nasId || !body.planId) {
    return NextResponse.json({ error: "NAS dan paket wajib." }, { status: 400 });
  }

  const [nas, plan] = await Promise.all([
    prisma.nas.findUnique({ where: { id: body.nasId } }),
    prisma.plan.findUnique({ where: { id: body.planId } }),
  ]);
  if (!nas) return NextResponse.json({ error: "NAS tidak ditemukan." }, { status: 404 });
  if (!plan) return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });

  const kind = body.kind === "hotspot" ? "hotspot" : "ppp";
  const code = body.customerCode?.trim() || makeMemberId();
  const dueAt = body.dueAt
    ? new Date(body.dueAt)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const payMode = (body.payMode?.trim() || "prepaid").toLowerCase();
  const trxStatus = (body.trxStatus?.trim() || "paid").toLowerCase();
  const invoiceStatus = trxStatus === "unpaid" ? "unpaid" : "paid";
  const accountStatus =
    body.status?.trim() ||
    (body.trxStatus === "on_process" || body.status === "pending" ? "pending" : "active");

  const discount = Number(body.discount ?? 0) || 0;
  const sellerFee = Number(body.sellerFee ?? 0) || 0;
  const setupFee = Number(body.setupFee ?? 0) || 0;
  const deviceFee = Number(body.deviceFee ?? 0) || 0;
  const applyTax = body.applyTax !== false;
  const vatPct = applyTax ? plan.vatPct || 11 : 0;
  const packageTotal = Math.max(0, plan.priceSell - discount);
  const { subTotal, taxAmount } = splitInclusiveTax(packageTotal, vatPct);
  const amount = packageTotal + deviceFee;

  const subscriptionType =
    body.subscriptionType === "non_regular" ? "non_regular" : "regular";
  const periodLabel = plan.validity || "1 Bulan";
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const row = await tx.customer.create({
        data: {
          customerCode: code,
          name: body.name!.trim(),
          username: body.username!.trim(),
          password: body.password!,
          phone: body.phone?.trim() ?? "",
          email: body.email?.trim() ?? "",
          address: body.address?.trim() ?? "",
          identityNumber: body.identityNumber?.trim() ?? "",
          note: body.note?.trim() ?? "",
          portalPassword: body.portalPassword?.trim() || body.password!,
          serviceType:
            body.serviceType?.trim() || (kind === "hotspot" ? "hotspot" : "pppoe"),
          kind,
          ip: body.ipAddressType === "static" ? (body.ip?.trim() ?? "") : "",
          localAddress: body.localAddress?.trim() ?? "",
          ipAddressType: body.ipAddressType === "static" ? "static" : "automatic",
          dueAt,
          renewedAt: invoiceStatus === "paid" ? now : null,
          owner: body.owner?.trim() || "admin",
          status: accountStatus,
          payMode,
          trxStatus: invoiceStatus,
          subscriptionType,
          expiredAction: body.expiredAction === "none" ? "none" : "isolir",
          discount,
          sellerFee,
          setupFee,
          deviceFee,
          applyTax,
          latitude: body.latitude?.trim() ?? "",
          longitude: body.longitude?.trim() ?? "",
          nasId: nas.id,
          planId: plan.id,
          odp: body.odp?.trim() ?? "",
          bindOnLogin: Boolean(body.bindOnLogin),
        },
        include: { plan: true, nas: true },
      });

      const invoice = await tx.invoice.create({
        data: {
          number: makeInvoiceNumber(),
          customerId: row.id,
          planName: plan.name,
          planNote: "",
          periodLabel,
          amount,
          subTotal,
          taxAmount,
          deviceFee,
          dueAt,
          status: invoiceStatus,
          method: "Manual",
          payMode,
          subscriptionType,
        },
      });

      return { row, invoice };
    });

    const company = await getCompanyProfile();
    return NextResponse.json(
      {
        row: mapCustomer(result.row),
        invoice: mapInvoice(result.invoice),
        company,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Username atau ID pelanggan sudah dipakai." },
      { status: 409 },
    );
  }
}
