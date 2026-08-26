import { DataTable } from "@/components/data-table";
import { PageHeader, Panel, StatusPill } from "@/components/ui";
import { staffList } from "@/lib/mock-data";
import { formatIdr } from "@/lib/utils";

export default function Page() {
  return (
    <div>
      <PageHeader title="Manajemen user" description="Admin, manager, operator/reseller." />
      <Panel>
        <DataTable
          headers={["Username", "Role", "Topup", "Saldo"]}
          rows={staffList.map((row) => [
            row.username,
            <StatusPill key={row.id} status={row.role} />,
            row.topup ? "ya" : "tidak",
            formatIdr(row.balance),
          ])}
        />
      </Panel>
    </div>
  );
}
