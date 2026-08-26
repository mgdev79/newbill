import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { signGate, verifyCaptchaToken } from "@/lib/member-captcha";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { answer?: string; action?: string };
  const jar = await cookies();
  const token = jar.get("nb_captcha")?.value ?? "";
  const answer = (body.answer ?? "").trim();

  if (!answer || !verifyCaptchaToken(token, answer)) {
    return NextResponse.json(
      { error: "kode keamanan salah" },
      { status: 400 },
    );
  }

  const action = body.action === "check" ? "check" : "buy";
  const expMs = Date.now() + 30 * 60 * 1000;
  const gate = signGate(expMs);

  const response = NextResponse.json({ ok: true, action });
  response.cookies.set("nb_evoucher_gate", gate, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 1800,
  });
  response.cookies.set("nb_evoucher_action", action, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 1800,
  });
  response.cookies.delete("nb_captcha");
  return response;
}
