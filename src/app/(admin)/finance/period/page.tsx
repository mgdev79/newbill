"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { PageHeader, Panel, StatCard, inputClass } from "@/components/ui";
import { formatDate, formatIdr } from "@/lib/utils";

type Row = {
  id: string;
  number: string;
  name: string;
  amount: number;
  method: string;
};

function monthBounds() {
  const d = new Date();
  const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

export default function Page() {
  const bounds = monthBounds();
  const [from, setFrom] = useState(bounds.from);
  const [to, setTo] = useState(bounds.to);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    void fetch(`/api/v1/invoices?status=paid&paidFrom=${from}&paidTo=${to}`)
      .then((r) => r.json())
      .then((data: { rows?: Row[] }) => setRows(data.rows ?? []));
  }, [from, to]);

  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div>
      <PageHeader
        title="Income periode"
        description="Invoice lunas pada rentang tanggal bayar (paidAt)."
      />
      <div className="mb-4">
        <StatCard tone="teal" label="Total lunas periode" value={formatIdr(total)} />
      </div>
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
