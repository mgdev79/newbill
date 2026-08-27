import { getCompanyProfile } from "@/lib/billing";
import { getDb } from "@/lib/db";
import { WhatsappSettingsForm } from "@/components/whatsapp-settings-form";
import { getRadiusPublicIp } from "@/server/radius-engine";

export default async function Page() {
  const prisma = await getDb();
  const publicIp = await getRadiusPublicIp();
  const appBaseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || (publicIp ? `https://${publicIp}` : "")
  ).replace(/\/$/, "");
  const [company, bank] = await Promise.all([
    getCompanyProfile(),
    prisma.appSetting.findUnique({ where: { key: "company_bank" } }),
  ]);
  return (
    <WhatsappSettingsForm
      appBaseUrl={appBaseUrl}
      companyName={company.name}
      companyAddress={company.address}
      companyPhone={company.phone}
      companyBank={bank?.value ?? ""}
    />
  );
}
