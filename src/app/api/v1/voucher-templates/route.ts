import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_VOUCHER_HTML } from "@/lib/voucher-template";

export const runtime = "nodejs";

function mapRow(row: {
  id: string;
  name: string;
  accessBy: string;
  enabled: boolean;
  html: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    accessBy: row.accessBy,
    enabled: row.enabled,
    html: row.html,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET() {
  const count = await prisma.voucherTemplate.count();
  if (count === 0) {
    await prisma.voucherTemplate.createMany({
      data: [
        {
          name: "Default-POS",
          accessBy: "all",
          enabled: true,
          html: DEFAULT_VOUCHER_HTML,
        },
        {
          name: "Minimal-Card",
          accessBy: "all",
          enabled: false,
          html: DEFAULT_VOUCHER_HTML.replace(
            "nb-voucher",
            "nb-voucher",
          ).replace("<h3>{{company}}</h3>", "<h3 style=\"color:#00a65a\">{{company}}</h3>"),
        },
      ],
    });
  }

  const rows = await prisma.voucherTemplate.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ rows: rows.map(mapRow) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    accessBy?: string;
    html?: string;
    enabled?: boolean;
  };

  const name = (body.name ?? "").trim().replace(/\s+/g, "-");
  if (!name || /[^a-zA-Z0-9_-]/.test(name)) {
    return NextResponse.json(
      {
        error:
          "Nama template wajib (huruf/angka/dash/underscore, tanpa spasi/simbol).",
      },
      { status: 400 },
    );
  }

  try {
    const row = await prisma.voucherTemplate.create({
      data: {
        name,
        accessBy: body.accessBy?.trim() || "all",
        html: body.html?.trim() || DEFAULT_VOUCHER_HTML,
        enabled: body.enabled !== false,
      },
    });
    return NextResponse.json({ row: mapRow(row) }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Nama template sudah dipakai." },
      { status: 409 },
    );
  }
}
