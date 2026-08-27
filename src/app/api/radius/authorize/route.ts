import { NextResponse } from "next/server";
import { authorize } from "@/server/aaa";
import { withApiErrorHandling } from "@/lib/api-handler";

export const POST = withApiErrorHandling(async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
    nasIp?: string;
    callingStationId?: string;
    calledStationId?: string;
  };
  if (!body.username) {
    return NextResponse.json(
      { error: { code: "422", message: "username wajib" } },
      { status: 422 },
    );
  }
  const result = await authorize({
    username: body.username,
    password: body.password,
    nasIp: body.nasIp,
    callingStationId: body.callingStationId,
    calledStationId: body.calledStationId,
  });
  return NextResponse.json(result);
});
