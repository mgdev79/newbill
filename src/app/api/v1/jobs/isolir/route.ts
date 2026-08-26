import { NextResponse } from "next/server";
import { runIsolirDueJob } from "@/server/isolir-job";

export const runtime = "nodejs";

function authorized(request: Request) {
  const token = process.env.FREERADIUS_JOB_TOKEN?.trim();
  if (!token) return true;
  const header = request.headers.get("authorization");
  const query = new URL(request.url).searchParams.get("token");
  return header === `Bearer ${token}` || query === token;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runIsolirDueJob();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
