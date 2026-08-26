import { LogPage } from "@/components/log-page";
import { logsActivity } from "@/lib/mock-data";

export default function Page() {
  return <LogPage title="Log aktivitas" rows={logsActivity} />;
}
