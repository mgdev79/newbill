import { DataTable } from "@/components/data-table";
import { PageHeader, Panel } from "@/components/ui";
import { topups } from "@/lib/mock-data";
import { formatIdr } from "@/lib/utils";

export default function Page() {
  return (
    <div>
      <PageHeader title="Topup reseller" description="Aktivasi saldo operator." />
      <Panel>
        <DataTable
          headers={["Tanggal", "Reseller", "Jumlah", "Status"]}
          rows={topups.map((row) => [row.at, row.reseller, formatIdr(row.amount), row.status])}
        />
      </Panel>
    </div>
  );
}
