"use client";

import { useEffect, useState } from "react";
import { PageHeader, Panel } from "@/components/ui";

type Odp = { id: string; name: string; capacity: number; used: number };

export default function Page() {
  const [rows, setRows] = useState<Odp[]>([]);

  useEffect(() => {
    void fetch("/api/v1/odps")
      .then((r) => r.json())
      .then((data: { rows?: Odp[] }) => setRows(data.rows ?? []));
  }, []);

  return (
    <div>
      <PageHeader
        title="Peta ODP | POP"
        description="Layout skematik dari data ODP di database, bukan peta satelit."
      />
      <Panel className="relative h-[420px] overflow-hidden bg-slate-50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:28px_28px]" />
        {rows.map((odp, index) => (
          <div
            key={odp.id}
            className="absolute rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
            style={{ left: `${16 + (index % 3) * 26}%`, top: `${24 + Math.floor(index / 3) * 22}%` }}
          >
            <p className="font-medium">{odp.name}</p>
            <p className="text-xs text-slate-500">
              {odp.used}/{odp.capacity} port
            </p>
          </div>
        ))}
        {!rows.length ? (
          <p className="relative z-10 p-4 text-sm text-slate-500">Belum ada ODP. Tambah di Kelola ODP.</p>
        ) : null}
      </Panel>
    </div>
  );
}
