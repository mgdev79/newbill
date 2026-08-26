"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { PageHeader, Panel, inputClass } from "@/components/ui";
import { invoices } from "@/lib/mock-data";
import { formatDate, formatIdr } from "@/lib/utils";

export default function Page() {
  const [from, setFrom] = useState("2026-08-01");
  const [to, setTo] = useState("2026-08-31");
  const rows = useMemo(
    () =>
      invoices.filter(
        (row) => row.status === "paid" && row.dueAt >= from && row.dueAt <= to,
      ),
    [from, to],
  );
  return (
    <div>
      <PageHeader title="Income periode" />
      <Panel>
        <div className="mb-4 flex gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
        </div>
        <DataTable
          headers={["Invoice", "Nama", "Jumlah", "Metode"]}
          rows={rows.map((row) => [row.number, row.name, formatIdr(row.amount), row.method])}
        />
      </Panel>
    </div>
  );
}
