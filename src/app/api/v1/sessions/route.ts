import { NextResponse } from "next/server";
import { listLiveSessions } from "@/server/nas-online";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") || undefined;
  const rows = await listLiveSessions(kind === "ppp" || kind === "hotspot" ? kind : undefined);
  return NextResponse.json({ rows });
}
