import { platformGatewayCallbackUrl, platformSignupReturnUrl } from "@/lib/tenant-host";
import { nicepayMerchantToken, verifyNicepayCallback, type NicepayConfig } from "@/server/nicepay";
import { getPlatformGatewaySetting } from "@/server/platform-gateway-settings";
import { settlePlatformGatewayPayment } from "@/server/platform-gateway-settle";

export async function getPlatformNicepayConfig(): Promise<NicepayConfig | null> {
  const row = await getPlatformGatewaySetting();
  if (!row.nicepayMerchantId || !row.nicepayMerchantKey) return null;
  return { merchantId: row.nicepayMerchantId, merchantKey: row.nicepayMerchantKey };
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
  if (code === "05" || code === "QRIS" || code === "EWALLET" || code === "SP") return "05";
  if (code.length === 2 && /^\d+$/.test(code)) return code;
  return "02";
}

export async function platformNicepayRegister(input: {
  referenceNo: string;
  amount: number;
  description: string;
  customer?: string;
  email?: string;
  phone?: string;
  channel?: string;
}) {
  const config = await getPlatformNicepayConfig();
  if (!config) return { ok: false as const, error: "Merchant ID / Key Nicepay platform belum diisi." };
  const timeStamp = timestampNow();
  const amt = String(Math.round(input.amount));
  const merchantToken = nicepayMerchantToken(
    timeStamp,
    config.merchantId,
    input.referenceNo,
    amt,
    config.merchantKey,
  );
  const callback = platformGatewayCallbackUrl("nicepay");
  const returnUrl = platformSignupReturnUrl();
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

export async function settlePlatformNicepayCallback(fields: Record<string, string>) {
  const ref = fields.referenceNo || fields.refNo || "";
  if (!ref) return { paid: false, status: "failed" as const };
  const paid = fields.resultCd === "0000";
  return settlePlatformGatewayPayment({
    ref,
    paid,
    channel: fields.payMethod ?? "",
    note: `Nicepay platform ${fields.tXid ?? ref} · ${fields.resultCd ?? ""} ${fields.resultMsg ?? ""}`.trim(),
  });
}

export { verifyNicepayCallback };
