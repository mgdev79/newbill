"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button, PageHeader, Panel, StatCard } from "@/components/ui";

type SessionRow = {
  sessionId: string;
  username: string;
  nasIp: string;
  framedIp: string;
  callingStationId: string;
  kind: string;
  startedAt: string;
};

export default function Page() {
  const [rows, setRows] = useState<SessionRow[]>([]);

  async function load() {
    const response = await fetch("/api/v1/sessions?kind=ppp");
    const json = (await response.json()) as { rows: SessionRow[] };
    setRows(json.rows);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Sesi PPP online"
        description="Dari accounting RADIUS (RadAcct). Disconnect menandai Stop di database."
      />
      <div className="mb-4 max-w-xs">
        <StatCard tone="aqua" label="PPP online" value={rows.length} />
      </div>
      <Panel title="Sesi aktif">
        <DataTable
          headers={["Username", "NAS", "IP", "MAC", "Mulai", "Aksi"]}
          rows={rows.map((row) => [
            row.username,
            row.nasIp,
            row.framedIp,
            row.callingStationId,
            new Date(row.startedAt).toLocaleString("id-ID"),
            <Button
              key={row.sessionId}
              variant="secondary"
              onClick={async () => {
                await fetch(`/api/v1/sessions/${row.sessionId}/disconnect`, {
                  method: "POST",
                });
                await load();
              }}
            >
              Disconnect
            </Button>,
          ])}
        />
      </Panel>
    </div>
  );
}
