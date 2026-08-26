import { getCompanyProfile } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { WhatsappSettingsForm } from "@/components/whatsapp-settings-form";

export default async function Page() {
  const appBaseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.RADIUS_PUBLIC_IP ? `https://${process.env.RADIUS_PUBLIC_IP}` : "")
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
