import { NextResponse } from "next/server";
import { disconnectSession } from "@/server/radius-coa";

export async function POST(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const result = await disconnectSession(sessionId);
  return NextResponse.json(result);
}
