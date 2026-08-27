import { platformPrisma as prisma } from "@/lib/platform-db";
import type { GatewayProvider } from "@/server/gateway-settle";

export type PlatformGatewaySettingPublic = {
  id: string;
  provider: GatewayProvider | "";
  duitkuEnvironment: "sandbox" | "production";
  duitkuMerchantCode: string;
  hasDuitkuApiKey: boolean;
  hasXenditApiSecret: boolean;
  hasXenditWebhookToken: boolean;
  nicepayMerchantId: string;
  hasNicepayMerchantKey: boolean;
  midtransEnvironment: "sandbox" | "production";
  midtransClientKey: string;
  hasMidtransServerKey: boolean;
};

export async function getPlatformGatewaySetting() {
  return prisma.platformGatewaySetting.upsert({
    where: { id: "platform" },
    create: { id: "platform" },
    update: {},
  });
}

export function publicPlatformGatewaySetting(row: {
  id: string;
  provider: string;
  duitkuEnvironment: string;
  duitkuMerchantCode: string;
  duitkuApiKey: string;
  xenditApiSecret: string;
  xenditWebhookToken: string;
  nicepayMerchantId: string;
  nicepayMerchantKey: string;
  midtransEnvironment: string;
  midtransClientKey: string;
  midtransServerKey: string;
}): PlatformGatewaySettingPublic {
  const provider =
    row.provider === "xendit" ||
    row.provider === "midtrans" ||
    row.provider === "nicepay" ||
    row.provider === "duitku"
      ? row.provider
      : "";
  return {
    id: row.id,
    provider,
    duitkuEnvironment: row.duitkuEnvironment === "sandbox" ? "sandbox" : "production",
    duitkuMerchantCode: row.duitkuMerchantCode,
    hasDuitkuApiKey: Boolean(row.duitkuApiKey),
    hasXenditApiSecret: Boolean(row.xenditApiSecret),
    hasXenditWebhookToken: Boolean(row.xenditWebhookToken),
    nicepayMerchantId: row.nicepayMerchantId,
    hasNicepayMerchantKey: Boolean(row.nicepayMerchantKey),
    midtransEnvironment: row.midtransEnvironment === "sandbox" ? "sandbox" : "production",
    midtransClientKey: row.midtransClientKey,
    hasMidtransServerKey: Boolean(row.midtransServerKey),
  };
}

export async function getActivePlatformGatewayProvider(): Promise<GatewayProvider> {
  const row = await getPlatformGatewaySetting();
  if (row.provider === "xendit" || row.provider === "midtrans" || row.provider === "nicepay") {
    return row.provider;
  }
  return "duitku";
}
