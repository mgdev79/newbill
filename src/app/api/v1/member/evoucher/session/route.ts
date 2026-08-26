import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCompanyProfile } from "@/lib/billing";
import { verifyGateToken } from "@/lib/member-captcha";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const gated = verifyGateToken(jar.get("nb_evoucher_gate")?.value);
  const action = jar.get("nb_evoucher_action")?.value === "check" ? "check" : "buy";
  const company = await getCompanyProfile();

  return NextResponse.json({
    gated,
    action: gated ? action : "buy",
    company: {
      name: company.name,
      phone: company.phone,
    },
  });
}
