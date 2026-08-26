"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { PageHeader, Panel } from "@/components/ui";

type Row = { id: string; at: string; actor: string; message: string };

const DESCRIPTIONS: Record<string, string> = {
  login: "Catatan login staff. Belum terhubung ke form login panel.",
  activity: "Aktivitas operator yang dicatat ke database.",
  bg: "Job latar (isolir, dsb). Baris ditulis otomatis saat job isolir jalan.",
  whatsapp: "Log pengiriman WhatsApp. Provider API belum diaktifkan — hanya catatan lokal.",
};

export function LogPage({
  title,
  kind,
}: {
  title: string;
  kind: "login" | "activity" | "bg" | "whatsapp";
}) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    void fetch(`/api/v1/activity-logs?kind=${kind}`)
      .then((r) => r.json())
      .then((data: { rows?: Row[] }) => setRows(data.rows ?? []));
  }, [kind]);

  return (
    <div>
      <PageHeader title={title} description={DESCRIPTIONS[kind]} />
      <Panel>
        <DataTable
          headers={["Waktu", "Aktor", "Pesan"]}
          rows={rows.map((row) => [
            new Intl.DateTimeFormat("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(row.at)),
            row.actor,
            row.message,
          ])}
        />
      </Panel>
    </div>
  );
}
