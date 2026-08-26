import { LogPage } from "@/components/log-page";
import { logsLogin } from "@/lib/mock-data";

export default function Page() {
  return <LogPage title="Log login" rows={logsLogin} />;
}
