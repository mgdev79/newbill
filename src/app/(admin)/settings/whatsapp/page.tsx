import { WhatsappSettingsForm } from "@/components/whatsapp-settings-form";

export default function Page() {
  const appBaseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.RADIUS_PUBLIC_IP ? `https://${process.env.RADIUS_PUBLIC_IP}` : "")
  ).replace(/\/$/, "");
  return <WhatsappSettingsForm appBaseUrl={appBaseUrl} />;
}
