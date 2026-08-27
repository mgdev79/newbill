import { NextResponse } from "next/server";
import {
  captchaSvg,
  randomCaptchaCode,
  signCaptcha,
} from "@/lib/member-captcha";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

export const GET = withApiErrorHandling(async function GET() {
  const code = randomCaptchaCode(6);
  const expMs = Date.now() + 5 * 60 * 1000;
  const token = signCaptcha(code, expMs);
  const svg = captchaSvg(code);

  const response = new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
  response.cookies.set("nb_captcha", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });
  return response;
});
