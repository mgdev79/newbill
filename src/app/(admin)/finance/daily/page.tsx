import { DataTable } from "@/components/data-table";
import { PageHeader, Panel, StatCard } from "@/components/ui";
import { invoices } from "@/lib/mock-data";
import { formatDate, formatIdr } from "@/lib/utils";

export default function Page() {
  const paid = invoices.filter((row) => row.status === "paid");
  const total = paid.reduce((sum, row) => sum + row.amount, 0);
  return (
    <div>
      <PageHeader title="Income harian" description="Invoice yang sudah paid pada rentang hari ini (mock)."/>
      <div className="mb-4">
        <StatCard tone="teal" label="Total lunas (sample)" value={formatIdr(total)} />
      </div>
      <Panel>
        <DataTable
          headers={["Invoice", "Nama", "Paket", "Jumlah", "Metode", "Jatuh tempo"]}
          rows={paid.map((row) => [
            row.number,
            row.name,
            row.plan,
            formatIdr(row.amount),
            row.method,
            formatDate(row.dueAt),
          ])}
        />
      </Panel>
    </div>
  );
}
