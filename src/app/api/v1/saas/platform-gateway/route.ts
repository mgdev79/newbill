import { NextResponse } from "next/server";
import {
  getPlatformGatewaySetting,
  publicPlatformGatewaySetting,
} from "@/server/platform-gateway-settings";
import { platformGatewayCallbackUrl, platformPublicOrigin } from "@/lib/tenant-host";
import type { GatewayProvider } from "@/server/gateway-settle";
import { platformPrisma as prisma } from "@/lib/platform-db";
import { withApiErrorHandling } from "@/lib/api-handler";

export const runtime = "nodejs";

export const GET = withApiErrorHandling(async function GET() {
  const row = await getPlatformGatewaySetting();
  const provider = publicPlatformGatewaySetting(row).provider;
  return NextResponse.json({
    row: publicPlatformGatewaySetting(row),
    callbackUrl: provider ? platformGatewayCallbackUrl(provider) : "",
    origin: platformPublicOrigin(),
  });
});

export const PUT = withApiErrorHandling(async function PUT(request: Request) {
  const body = (await request.json()) as {
    provider?: string;
    duitkuEnvironment?: string;
    duitkuMerchantCode?: string;
    duitkuApiKey?: string;
    xenditApiSecret?: string;
    xenditWebhookToken?: string;
    nicepayMerchantId?: string;
    nicepayMerchantKey?: string;
    midtransEnvironment?: string;
    midtransClientKey?: string;
    midtransServerKey?: string;
  };
  const provider = body.provider?.trim() ?? "";
  if (provider && provider !== "duitku" && provider !== "xendit" && provider !== "midtrans" && provider !== "nicepay") {
    return NextResponse.json({ error: "Provider tidak dikenal." }, { status: 400 });
  }
  const current = await getPlatformGatewaySetting();
  const row = await prisma.platformGatewaySetting.update({
    where: { id: current.id },
    data: {
      provider: provider || current.provider,
      duitkuEnvironment: body.duitkuEnvironment === "sandbox" ? "sandbox" : body.duitkuEnvironment === "production" ? "production" : current.duitkuEnvironment,
      duitkuMerchantCode: body.duitkuMerchantCode ?? current.duitkuMerchantCode,
      duitkuApiKey: body.duitkuApiKey || current.duitkuApiKey,
      xenditApiSecret: body.xenditApiSecret || current.xenditApiSecret,
      xenditWebhookToken: body.xenditWebhookToken || current.xenditWebhookToken,
      nicepayMerchantId: body.nicepayMerchantId ?? current.nicepayMerchantId,
      nicepayMerchantKey: body.nicepayMerchantKey || current.nicepayMerchantKey,
      midtransEnvironment: body.midtransEnvironment === "sandbox" ? "sandbox" : body.midtransEnvironment === "production" ? "production" : current.midtransEnvironment,
      midtransClientKey: body.midtransClientKey ?? current.midtransClientKey,
      midtransServerKey: body.midtransServerKey || current.midtransServerKey,
    },
  });
  const pub = publicPlatformGatewaySetting(row);
  return NextResponse.json({
    row: pub,
    callbackUrl: pub.provider ? platformGatewayCallbackUrl(pub.provider as GatewayProvider) : "",
  });
});
