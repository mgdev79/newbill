"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button, PageHeader, Panel, StatusPill, inputClass } from "@/components/ui";
import { formatDate, formatIdr } from "@/lib/utils";

type Row = {
  id: string;
  number: string;
  customerCode: string;
  name: string;
  plan: string;
  amount: number;
  dueAt: string;
  method: string;
  owner: string;
  status: string;
};

export default function InvoicesPage({ period }: { period?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<"all" | "unpaid" | "paid">("unpaid");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams({ status });
    if (period) {
      params.set("from", from);
      params.set("to", to);
    }
    const data = await fetch(`/api/v1/invoices?${params}`).then((r) => r.json());
    setRows(data.rows ?? []);
  }

  useEffect(() => {
    void load();
  }, [status, from, to, period]);

  const selectedIds = useMemo(
    () => rows.filter((row) => selected[row.id]).map((row) => row.id),
    [rows, selected],
  );

  async function markPaid() {
    if (!selectedIds.length) {
      setToast("Centang tagihan dulu.");
      return;
    }
    for (const id of selectedIds) {
      await fetch(`/api/v1/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid", method: "Manual" }),
      });
    }
    setSelected({});
    setToast(`${selectedIds.length} tagihan ditandai lunas.`);
    await load();
  }

  return (
    <div>
      <PageHeader
        title={period ? "Tagihan periode" : "Semua tagihan"}
        description="Data invoice dari database. Tandai lunas menyimpan status ke Prisma."
      />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#d6e9c6] bg-[#dff0d8] px-3 py-2 text-[13px] text-[#3c763d]">
          {toast}
        </p>
      ) : null}
      <Panel title={period ? "Tagihan periode" : "Daftar tagihan"}>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          {period ? (
            <>
              <label className="text-[12px] text-[#555]">
                Dari
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
              </label>
              <label className="text-[12px] text-[#555]">
                Sampai
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
              </label>
            </>
          ) : null}
          {(["unpaid", "paid", "all"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatus(id)}
              className={
                status === id
                  ? "rounded-sm bg-[var(--lte-blue)] px-2.5 py-1 text-[12px] text-white"
                  : "rounded-sm border border-[var(--lte-line)] bg-white px-2.5 py-1 text-[12px] text-[#444]"
              }
            >
              {id === "unpaid" ? "Belum lunas" : id === "paid" ? "Lunas" : "Semua"}
            </button>
          ))}
          <Button variant="secondary" onClick={() => void markPaid()}>
            Tandai lunas
          </Button>
        </div>
        <DataTable
          headers={[
            "",
            "Nomor",
            "ID",
            "Nama",
            "Paket",
            "Jumlah",
            "Jatuh tempo",
            "Metode",
            "Owner",
            "Status",
          ]}
          rows={rows.map((row) => [
            <input
              key={`${row.id}-c`}
              type="checkbox"
              checked={Boolean(selected[row.id])}
              onChange={(e) => setSelected((prev) => ({ ...prev, [row.id]: e.target.checked }))}
              aria-label={`Pilih ${row.number}`}
            />,
            row.number,
            row.customerCode,
            row.name,
            row.plan,
            formatIdr(row.amount),
            formatDate(row.dueAt),
            row.method,
            row.owner,
            <StatusPill key={row.id} status={row.status} />,
          ])}
        />
      </Panel>
    </div>
  );
}
