"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { PageHeader, Panel, StatCard } from "@/components/ui";
import { formatDate, formatIdr } from "@/lib/utils";

type Row = {
  id: string;
  number: string;
  name: string;
  plan: string;
  amount: number;
  method: string;
  dueAt: string;
  paidAt: string | null;
};

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    void fetch(`/api/v1/invoices?status=paid&paidFrom=${today}&paidTo=${today}`)
      .then((r) => r.json())
      .then((data: { rows?: Row[] }) => setRows(data.rows ?? []));
  }, [today]);

  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div>
      <PageHeader
        title="Income harian"
        description="Invoice berstatus paid yang lunas hari ini (paidAt, atau createdAt jika paidAt kosong)."
      />
      <div className="mb-4">
        <StatCard tone="teal" label="Total lunas hari ini" value={formatIdr(total)} />
      </div>
      <Panel>
        <DataTable
          headers={["Invoice", "Nama", "Paket", "Jumlah", "Metode", "Jatuh tempo"]}
          rows={rows.map((row) => [
            row.number,
            row.name,
            row.plan,
            formatIdr(row.amount),
            row.method,
            formatDate(row.dueAt),
          ])}
        />
      </Panel>
    </div>
  );
}
