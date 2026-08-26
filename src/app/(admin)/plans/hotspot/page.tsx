import { DataTable } from "@/components/data-table";
import { PageHeader, Panel } from "@/components/ui";
import { plans } from "@/lib/mock-data";
import { formatIdr } from "@/lib/utils";

export default function Page() {
  const rows = plans.filter((row) => row.type === "hotspot");
  return (
    <div>
      <PageHeader title="Profil hotspot" description="Time/quota based mengikuti plan." />
      <Panel>
        <DataTable
          headers={["Nama", "Harga", "Masa aktif", "Bandwidth", "Grup", "Shared"]}
          rows={rows.map((row) => [
            row.name,
            formatIdr(row.priceSell),
            row.validity,
            row.bandwidth,
            row.group,
            String(row.sharedUsers),
          ])}
        />
      </Panel>
    </div>
  );
}
