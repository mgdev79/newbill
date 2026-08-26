import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { getBillingTenant } from "@/lib/saas";
import { gatewayCallbackUrl, tenantPublicOrigin } from "@/lib/tenant-host";
import { settleGatewayPayment } from "@/server/gateway-settle";

export type NicepayConfig = {
  merchantId: string;
  merchantKey: string;
};

export async function getNicepayConfig(): Promise<NicepayConfig | null> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: ["gateway.nicepay.merchant_id", "gateway.nicepay.merchant_key"] } },
  });
  const get = (key: string) => rows.find((row) => row.key === key)?.value ?? "";
  const merchantId = get("gateway.nicepay.merchant_id");
  const merchantKey = get("gateway.nicepay.merchant_key");
  if (!merchantId || !merchantKey) return null;
  return { merchantId, merchantKey };
}

/** docs.nicepay.co.id: SHA256(timeStamp + iMid + refNo + amount + merchantKey) */
export function nicepayMerchantToken(
  timeStamp: string,
  iMid: string,
  refNo: string,
  amount: string,
  merchantKey: string,
) {
  return createHash("sha256").update(`${timeStamp}${iMid}${refNo}${amount}${merchantKey}`).digest("hex");
}

export function verifyNicepayCallback(
  fields: {
    timeStamp?: string;
    iMid?: string;
    referenceNo?: string;
    amt?: string;
    merchantToken?: string;
  },
  config: NicepayConfig,
) {
  const token = fields.merchantToken ?? "";
  if (!token) return false;
  const iMid = fields.iMid || config.merchantId;
  const refNo = fields.referenceNo ?? "";
  const amt = fields.amt ?? "";
  const withTs = fields.timeStamp
    ? nicepayMerchantToken(fields.timeStamp, iMid, refNo, amt, config.merchantKey)
    : "";
  const v1 = createHash("sha256")
    .update(`${iMid}${refNo}${amt}${config.merchantKey}`)
    .digest("hex");
  return token === withTs || token === v1;
}

function timestampNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function mapPayMethod(channel: string) {
  const code = channel.trim().toUpperCase();
  if (code === "02" || code === "VA") return "02";
  if (code === "03" || code === "ALFAMART" || code === "IR" || code === "FT") return "03";
  if (code === "05" || code === "QRIS" || code === "EWALLET") return "05";
  if (code.length === 2 && /^\d+$/.test(code)) return code;
  return "02";
}

export async function nicepayRegister(input: {
  referenceNo: string;
  amount: number;
  description: string;
  customer?: string;
  email?: string;
  phone?: string;
  channel?: string;
}) {
  const config = await getNicepayConfig();
  if (!config) return { ok: false as const, error: "Merchant ID / Key Nicepay belum diisi." };
  const tenant = await getBillingTenant();
  if (!tenant) return { ok: false as const, error: "Tenant billing belum dikonfigurasi." };
  const timeStamp = timestampNow();
  const amt = String(Math.round(input.amount));
  const merchantToken = nicepayMerchantToken(
    timeStamp,
    config.merchantId,
    input.referenceNo,
    amt,
    config.merchantKey,
  );
  const callback = gatewayCallbackUrl(tenant.code, "nicepay");
  const returnUrl = `${tenantPublicOrigin(tenant.code)}/payments/duitku`;
  const response = await fetch("https://www.nicepay.co.id/nicepay/direct/v2/registration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timeStamp,
      iMid: config.merchantId,
      payMethod: mapPayMethod(input.channel ?? ""),
      currency: "IDR",
      amt,
      merchantToken,
      referenceNo: input.referenceNo,
      goodsNm: input.description,
      billingNm: input.customer || input.referenceNo,
      billingPhone: input.phone || "080000000000",
      billingEmail: input.email || "billing@juraganlapak.com",
      billingAddr: "-",
      billingCity: "Jakarta",
      billingState: "DKI Jakarta",
      billingPostCd: "10110",
      billingCountry: "Indonesia",
      dbProcessUrl: callback,
      callBackUrl: returnUrl,
      userIP: "127.0.0.1",
      cartData: JSON.stringify({
        count: "1",
        item: [{ goods_name: input.description, goods_amt: amt }],
      }),
    }),
  });
  const data = (await response.json().catch(() => null)) as {
    resultCd?: string;
    resultMsg?: string;
    tXid?: string;
    paymentUrl?: string;
    vacctNo?: string;
  } | null;
  if (!response.ok || data?.resultCd !== "0000") {
    return {
      ok: false as const,
      error: data?.resultMsg || data?.resultCd || `Nicepay HTTP ${response.status}`,
    };
  }
  return {
    ok: true as const,
    paymentUrl: data.paymentUrl ?? "",
    reference: data.tXid ?? "",
    vaNumber: data.vacctNo ?? "",
  };
}

export function parseNicepayFields(raw: string, contentType: string | null) {
  const fields: Record<string, string> = {};
  if ((contentType ?? "").includes("application/json")) {
    try {
      const json = JSON.parse(raw) as Record<string, unknown>;
      for (const [key, value] of Object.entries(json)) {
        if (value != null) fields[key] = String(value);
      }
    } catch {
      return fields;
    }
  } else {
    const parsed = new URLSearchParams(raw);
    for (const [key, value] of parsed) fields[key] = value;
  }
  return fields;
}

export async function settleNicepayCallback(fields: Record<string, string>) {
  const ref = fields.referenceNo || fields.refNo || "";
  if (!ref) return { paid: false, status: "failed" };
  const paid = fields.resultCd === "0000";
  return settleGatewayPayment({
    ref,
    paid,
    channel: fields.payMethod ?? "",
    note: `Nicepay ${fields.tXid ?? ref} · ${fields.resultCd ?? ""} ${fields.resultMsg ?? ""}`.trim(),
    method: "Nicepay",
  });
}
