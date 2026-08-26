import { NextResponse } from "next/server";
import { disconnectSession } from "@/server/aaa";

export async function POST(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  await disconnectSession(sessionId);
  return NextResponse.json({ ok: true });
}
