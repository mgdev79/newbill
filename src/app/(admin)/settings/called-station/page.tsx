import { DataTable } from "@/components/data-table";
import { PageHeader, Panel } from "@/components/ui";
import { calledStations } from "@/lib/mock-data";

export default function Page() {
  return (
    <div>
      <PageHeader title="Called station" description="Batasi login ke server hotspot/PPPoE tertentu." />
      <Panel>
        <DataTable
          headers={["Tipe", "NAS", "Nama server"]}
          rows={calledStations.map((row) => [row.type, row.nas, row.name])}
        />
      </Panel>
    </div>
  );
}
