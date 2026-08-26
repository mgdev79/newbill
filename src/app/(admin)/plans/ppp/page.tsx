import { DataTable } from "@/components/data-table";
import { PageHeader, Panel } from "@/components/ui";
import { plans } from "@/lib/mock-data";
import { formatIdr } from "@/lib/utils";

export default function Page() {
  const rows = plans.filter((row) => row.type === "ppp");
  return (
    <div>
      <PageHeader title="Profil PPP" description="Harga dasar, jual, PPN, validity, grup." />
      <Panel>
        <DataTable
          headers={["Nama", "Dasar", "Jual", "PPN", "Masa aktif", "Bandwidth", "Grup", "Shared"]}
          rows={rows.map((row) => [
            row.name,
            formatIdr(row.priceBase),
            formatIdr(row.priceSell),
            `${row.vatPct}%`,
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
