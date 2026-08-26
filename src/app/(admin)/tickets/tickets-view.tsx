import { DataTable } from "@/components/data-table";
import { PageHeader, Panel, StatusPill } from "@/components/ui";
import { tickets } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import type { TicketStatus } from "@/lib/types";

export default function TicketsPage({ filter }: { filter?: TicketStatus }) {
  const rows = filter ? tickets.filter((row) => row.status === filter) : tickets;
  const title =
    filter === "open" ? "Tiket aktif" : filter === "closed" ? "Tiket ditutup" : "Semua tiket";
  return (
    <div>
      <PageHeader title={title} description="Portal pelanggan belum live." />
      <Panel>
        <DataTable
          headers={["Subjek", "Pelanggan", "Status", "Dibuat"]}
          rows={rows.map((row) => [
            row.subject,
            row.customer,
            <StatusPill key={row.id} status={row.status} />,
            formatDate(row.createdAt),
          ])}
        />
      </Panel>
    </div>
  );
}
