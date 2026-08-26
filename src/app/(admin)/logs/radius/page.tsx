"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { PageHeader, Panel, StatusPill } from "@/components/ui";

type Log = { id: string; at: string; username: string; result: string; message: string };

export default function Page() {
  const [rows, setRows] = useState<Log[]>([]);

  useEffect(() => {
    void fetch("/api/v1/radius/logs")
      .then((response) => response.json())
      .then((json: { rows: Log[] }) => setRows(json.rows));
  }, []);

  return (
    <div>
      <PageHeader title="Log RADIUS" description="Accept/Reject dari engine AAA." />
      <Panel>
        <DataTable
          headers={["Waktu", "User", "Hasil", "Pesan"]}
          rows={rows.map((row) => [
            new Date(row.at).toLocaleString("id-ID"),
            row.username,
            <StatusPill key={row.id} status={row.result} />,
            row.message,
          ])}
        />
      </Panel>
    </div>
  );
}
