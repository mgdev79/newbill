import { DataTable } from "@/components/data-table";
import { PageHeader, Panel, StatusPill } from "@/components/ui";
import { duitkuTrx } from "@/lib/mock-data";
import { formatIdr } from "@/lib/utils";

export default function Page() {
  return (
    <div>
      <PageHeader title="Duitku" description="Laporan transaksi payment gateway." />
      <Panel>
        <DataTable
          headers={["Referensi", "Pelanggan", "Channel", "Jumlah", "Status", "Waktu"]}
          rows={duitkuTrx.map((row) => [
            row.ref,
            row.customer,
            row.channel,
            formatIdr(row.amount),
            <StatusPill key={row.id} status={row.status} />,
            row.at,
          ])}
        />
      </Panel>
    </div>
  );
}
