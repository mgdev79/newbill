import { DataTable } from "@/components/data-table";
import { PageHeader, Panel } from "@/components/ui";
import { profileGroups } from "@/lib/mock-data";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Grup profil"
        description="Inject ke MikroTik PPP/Hotspot profile + IP pool."
      />
      <Panel>
        <DataTable
          headers={["Nama", "Tipe", "NAS", "Pool", "Owner"]}
          rows={profileGroups.map((row) => [row.name, row.type, row.nas, row.pool, row.owner])}
        />
      </Panel>
    </div>
  );
}
