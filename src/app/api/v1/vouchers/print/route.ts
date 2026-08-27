import { NextResponse } from "next/server";
import { getCompanyProfile } from "@/lib/billing";
import { getDb } from "@/lib/db";
import { renderVoucherTemplate } from "@/lib/voucher-template";

export const runtime = "nodejs";

/** Cetak voucher memakai template HTML dari Pengaturan. */
export async function POST(request: Request) {
  const prisma = await getDb();
  const body = (await request.json()) as {
    templateId?: string;
    voucherIds?: string[];
    batchId?: string;
  };

  const template = body.templateId
    ? await prisma.voucherTemplate.findUnique({ where: { id: body.templateId } })
    : await prisma.voucherTemplate.findFirst({
        where: { enabled: true },
        orderBy: { name: "asc" },
      });

  if (!template) {
    return NextResponse.json(
      { error: "Belum ada template aktif. Buat di Pengaturan → Template voucher." },
      { status: 404 },
    );
  }

  if (!body.voucherIds?.length && !body.batchId) {
    return NextResponse.json(
      { error: "Pilih voucher atau batch untuk dicetak." },
      { status: 400 },
    );
  }

  const vouchers = await prisma.voucher.findMany({
    where: body.voucherIds?.length
      ? { id: { in: body.voucherIds } }
      : { batchId: body.batchId! },
    include: {
      plan: { include: { bandwidth: true } },
      nas: true,
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  if (!vouchers.length) {
    return NextResponse.json({ error: "Tidak ada voucher untuk dicetak." }, { status: 400 });
  }

  const company = await getCompanyProfile();
  const html = renderVoucherTemplate(
    template.html,
    vouchers.map((row, index) => ({
      number: index + 1,
      code: row.code,
      secret: row.password,
      total: row.plan.priceSell.toLocaleString("id-ID"),
      plan_name: row.plan.name,
      bandwidth: `${row.plan.bandwidth.maxDown}/${row.plan.bandwidth.maxUp}`,
      validperiod: row.plan.validity,
      timelimit: "—",
      datalimit: "—",
      type: row.kind.toUpperCase(),
      company: company.name,
      phone: company.phone,
      hotspot_url: row.nas.hotspotUrl || "",
      qrcode: row.nas.hotspotUrl || "",
    })),
  );

  const page = `<!doctype html><html><head><meta charset="utf-8"/><title>Cetak ${template.name}</title></head><body>${html}<script>window.onload=()=>window.print()</script></body></html>`;

  return NextResponse.json({
    template: { id: template.id, name: template.name },
    count: vouchers.length,
    html: page,
  });
}
