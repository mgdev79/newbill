import { DataTable } from "@/components/data-table";
import { PageHeader, Panel } from "@/components/ui";
import { sessions } from "@/lib/mock-data";

export default function Page() {
  const rows = sessions.filter((row) => row.kind === "hotspot");
  return (
    <div>
      <PageHeader title="Sesi hotspot online" description="Tidak ada sesi aktif pada data mock." />
      <Panel title="Sesi aktif">
        {rows.length === 0 ? (
          <p className="text-[13px] text-[var(--lte-muted)]">Tidak ada user hotspot online.</p>
        ) : (
          <DataTable
            headers={["Username", "Nama", "NAS", "IP", "MAC", "Uptime"]}
            rows={rows.map((row) => [row.username, row.name, row.nas, row.ip, row.mac, row.uptime])}
          />
        )}
      </Panel>
    </div>
  );
}
