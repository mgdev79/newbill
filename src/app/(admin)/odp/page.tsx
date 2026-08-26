import { DataTable } from "@/components/data-table";
import { PageHeader, Panel } from "@/components/ui";
import { odpList } from "@/lib/mock-data";

export default function Page() {
  return (
    <div>
      <PageHeader title="Kelola ODP | POP" description="Titik distribusi fisik pelanggan." />
      <Panel>
        <DataTable
          headers={["Nama", "Area", "Kapasitas", "Terpakai", "Sisa"]}
          rows={odpList.map((row) => [
            row.name,
            row.area,
            String(row.capacity),
            String(row.used),
            String(row.capacity - row.used),
          ])}
        />
      </Panel>
    </div>
  );
}
