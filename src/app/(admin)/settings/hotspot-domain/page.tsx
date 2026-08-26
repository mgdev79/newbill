import { DataTable } from "@/components/data-table";
import { PageHeader, Panel } from "@/components/ui";
import { hotspotDomains } from "@/lib/mock-data";

export default function Page() {
  return (
    <div>
      <PageHeader title="Domain hotspot" description="Untuk QR login voucher." />
      <Panel>
        <DataTable headers={["Domain"]} rows={hotspotDomains.map((row) => [row.domain])} />
      </Panel>
    </div>
  );
}
