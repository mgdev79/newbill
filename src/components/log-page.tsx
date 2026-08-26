import { DataTable } from "@/components/data-table";
import { PageHeader, Panel } from "@/components/ui";
import type { LogRow } from "@/lib/types";

export function LogPage({ title, rows }: { title: string; rows: LogRow[] }) {
  return (
    <div>
      <PageHeader title={title} description="Log mock, auto-purge belum dijalankan." />
      <Panel>
        <DataTable
          headers={["Waktu", "Aktor", "Pesan"]}
          rows={rows.map((row) => [row.at, row.actor, row.message])}
        />
      </Panel>
    </div>
  );
}
