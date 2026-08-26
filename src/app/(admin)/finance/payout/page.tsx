import { DataTable } from "@/components/data-table";
import { PageHeader, Panel, StatCard } from "@/components/ui";
import { payouts } from "@/lib/mock-data";
import { formatIdr } from "@/lib/utils";

export default function Page() {
  const total = payouts.reduce((sum, row) => sum + row.amount, 0);
  return (
    <div>
      <PageHeader title="Pengeluaran" />
      <div className="mb-4">
        <StatCard tone="rose" label="Total sample" value={formatIdr(total)} />
      </div>
      <Panel>
        <DataTable
          headers={["Tanggal", "Kategori", "Catatan", "Jumlah"]}
          rows={payouts.map((row) => [row.at, row.category, row.note, formatIdr(row.amount)])}
        />
      </Panel>
    </div>
  );
}
