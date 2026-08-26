import { LogPage } from "@/components/log-page";
import { logsWhatsapp } from "@/lib/mock-data";

export default function Page() {
  return <LogPage title="Log WA blast" rows={logsWhatsapp} />;
}
