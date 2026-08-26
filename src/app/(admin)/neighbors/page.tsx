import { DataTable } from "@/components/data-table";
import { PageHeader, Panel } from "@/components/ui";
import { neighbors } from "@/lib/mock-data";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="List neighbor"
        description="Data neighbor MikroTik (mock). Tombol API MikroTik mengarah ke sini dulu."
      />
      <Panel>
        <DataTable
          headers={["Identity", "Address", "MAC", "Board"]}
          rows={neighbors.map((row) => [row.identity, row.address, row.mac, row.board])}
        />
      </Panel>
    </div>
  );
}
