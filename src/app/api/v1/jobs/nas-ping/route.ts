import { NextResponse } from "next/server";
import { runNasPingJob } from "@/server/nas-ping-job";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

function authorized(request: Request) {
  const token = process.env.FREERADIUS_JOB_TOKEN?.trim();
  if (!token) return true;
  const header = request.headers.get("authorization");
  const query = new URL(request.url).searchParams.get("token");
  return header === `Bearer ${token}` || query === token;
}

export const GET = withApiErrorHandling(async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runNasPingJob();
  return NextResponse.json(result);
});

export const POST = withApiErrorHandling(async function POST(request: Request) {
  return GET(request);
});
