import { DataTable } from "@/components/data-table";
import { PageHeader, Panel } from "@/components/ui";
import { bandwidths } from "@/lib/mock-data";

export default function Page() {
  return (
    <div>
      <PageHeader title="Profil bandwidth" description="Min/max rate untuk plan." />
      <Panel>
        <DataTable
          headers={["Nama", "Min up", "Max up", "Min down", "Max down", "Owner"]}
          rows={bandwidths.map((row) => [
            row.name,
            row.minUp,
            row.maxUp,
            row.minDown,
            row.maxDown,
            row.owner,
          ])}
        />
      </Panel>
    </div>
  );
}
