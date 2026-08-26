import { LogPage } from "@/components/log-page";
import { logsBg } from "@/lib/mock-data";

export default function Page() {
  return <LogPage title="Log background" rows={logsBg} />;
}
