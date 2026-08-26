import { NextResponse } from "next/server";
import { writeActivityLog } from "@/server/activity-log";

export const runtime = "nodejs";

const PROVIDERS = ["duitku", "xendit", "midtrans", "nicepay"] as const;

function isProvider(value: string): value is (typeof PROVIDERS)[number] {
  return PROVIDERS.includes(value as (typeof PROVIDERS)[number]);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: provider } = await context.params;
  if (!isProvider(provider)) {
    return NextResponse.json({ error: "Provider tidak dikenal." }, { status: 404 });
  }
  const raw = await request.text();
  await writeActivityLog({
    kind: "activity",
    actor: "gateway",
    message: `Callback ${provider} diterima (${raw.length} byte). Verifikasi signature dan pelunasan invoice belum diaktifkan.`,
  });
  return NextResponse.json(
    {
      error:
        "Callback diterima. Verifikasi signature dan pelunasan invoice belum diaktifkan.",
    },
    { status: 202 },
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: provider } = await context.params;
  if (!isProvider(provider)) {
    return NextResponse.json({ error: "Provider tidak dikenal." }, { status: 404 });
  }
  return NextResponse.json({ error: "Gunakan POST dari payment gateway." }, { status: 405 });
}
