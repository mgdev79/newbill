"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button, PageHeader, Panel, StatCard } from "@/components/ui";

type SessionRow = {
  sessionId: string;
  username: string;
  name: string;
  nasIp: string;
  framedIp: string;
  callingStationId: string;
  kind: string;
  startedAt: string;
};

export function SessionsPage({
  kind,
  title,
}: {
  kind: "ppp" | "hotspot";
  title: string;
}) {
  const [rows, setRows] = useState<SessionRow[]>([]);

  async function load() {
    const response = await fetch(`/api/v1/sessions?kind=${kind}`);
    const json = (await response.json()) as { rows: SessionRow[] };
    setRows(json.rows ?? []);
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [kind]);

  return (
    <div>
      <PageHeader
        title={title}
        description="Sesi aktif dari RadAcct SQLite digabung radacct FreeRADIUS."
      />
      <div className="mb-4 max-w-xs">
        <StatCard tone={kind === "ppp" ? "aqua" : "red"} label={`${kind.toUpperCase()} online`} value={rows.length} />
      </div>
      <Panel title="Sesi aktif">
        {rows.length === 0 ? (
          <p className="text-[13px] text-[var(--lte-muted)]">Tidak ada user {kind} online.</p>
        ) : (
          <DataTable
            headers={["Username", "Nama", "NAS", "IP", "MAC", "Mulai", "Aksi"]}
            rows={rows.map((row) => [
              row.username,
              row.name,
              row.nasIp,
              row.framedIp,
              row.callingStationId,
              new Date(row.startedAt).toLocaleString("id-ID"),
              <Button
                key={row.sessionId}
                variant="secondary"
                onClick={async () => {
                  await fetch(`/api/v1/sessions/${row.sessionId}/disconnect`, { method: "POST" });
                  await load();
                }}
              >
                Disconnect
              </Button>,
            ])}
          />
        )}
      </Panel>
    </div>
  );
}
