"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button, PageHeader, Panel, StatusPill, inputClass } from "@/components/ui";
import { invoices } from "@/lib/mock-data";
import { formatDate, formatIdr } from "@/lib/utils";

export default function InvoicesPage({ period }: { period?: boolean }) {
  const [status, setStatus] = useState<"all" | "unpaid" | "paid">("unpaid");
  const [from, setFrom] = useState("2026-08-01");
  const [to, setTo] = useState("2026-08-31");
  const rows = useMemo(() => {
    return invoices.filter((row) => {
      const matchStatus = status === "all" ? true : row.status === status;
      if (!period) return matchStatus;
      return matchStatus && row.dueAt >= from && row.dueAt <= to;
    });
  }, [from, period, status, to]);

  return (
    <div>
      <PageHeader
        title={period ? "Tagihan periode" : "Semua tagihan"}
        description="Mark paid / void menunggu API kasir."
      />
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
          <Button variant="secondary">Tandai lunas</Button>
        </div>
        <DataTable
          headers={["Nomor", "ID", "Nama", "Paket", "Jumlah", "Jatuh tempo", "Metode", "Owner", "Status"]}
          rows={rows.map((row) => [
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
