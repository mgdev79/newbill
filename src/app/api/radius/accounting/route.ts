import { NextResponse } from "next/server";
import { accounting } from "@/server/aaa";
import { withApiErrorHandling } from "@/lib/api-handler";

export const POST = withApiErrorHandling(async function POST(request: Request) {
  const body = (await request.json()) as {
    statusType?: "Start" | "Interim-Update" | "Stop";
    sessionId?: string;
    username?: string;
    nasIp?: string;
    framedIp?: string;
    callingStationId?: string;
    inputOctets?: number;
    outputOctets?: number;
    sessionTime?: number;
  };
  if (!body.username || !body.sessionId || !body.statusType) {
    return NextResponse.json(
      { error: { code: "422", message: "username, sessionId, statusType wajib" } },
      { status: 422 },
    );
  }
  const result = await accounting({
    statusType: body.statusType,
    sessionId: body.sessionId,
    username: body.username,
    nasIp: body.nasIp,
    framedIp: body.framedIp,
    callingStationId: body.callingStationId,
    inputOctets: body.inputOctets,
    outputOctets: body.outputOctets,
    sessionTime: body.sessionTime,
  });
  return NextResponse.json(result);
});
