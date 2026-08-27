"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button, PageHeader, Panel, StatusPill } from "@/components/ui";
import { formatIdr } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  email: string;
  subdomain: string;
  planName: string;
  amount: number;
  status: string;
  activatedTenantId: string;
  note: string;
  createdAt: string;
};

export default function SignupOrdersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await fetch("/api/v1/saas/signup-orders").then((r) => r.json());
    setRows(data.rows ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markCash(id: string) {
    if (!window.confirm("Tandai bayar tunai dan aktifkan tenant sekarang?")) return;
    setBusyId(id);
    setToast(null);
    const response = await fetch(`/api/v1/saas/signup-orders/${id}/cash`, { method: "POST" });
    const data = (await response.json()) as { error?: string };
    setBusyId(null);
    if (!response.ok) {
      setToast(data.error ?? "Gagal.");
      return;
    }
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Order signup"
        description="Tenant baru hanya dibuat setelah bayar (callback gateway platform) atau tombol bayar tunai."
      />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
          {toast}
        </p>
      ) : null}
      <Panel>
        <DataTable
          headers={["Waktu", "Nama", "Subdomain", "Paket", "Jumlah", "Status", ""]}
          rows={rows.map((row) => [
            row.createdAt.slice(0, 19).replace("T", " "),
            <span key={`${row.id}-n`}>
              {row.name}
              <span className="block text-[11px] text-slate-500">{row.email}</span>
            </span>,
            row.subdomain,
            row.planName,
            formatIdr(row.amount),
            <StatusPill key={`${row.id}-s`} status={row.status} />,
            row.status === "pending" ? (
              <Button
                key={`${row.id}-c`}
                variant="secondary"
                disabled={busyId === row.id}
                onClick={() => void markCash(row.id)}
              >
                Tandai Bayar Tunai
              </Button>
            ) : (
              <span key={`${row.id}-d`} className="text-[11px] text-slate-500">
                {row.activatedTenantId ? row.activatedTenantId.slice(0, 8) : "—"}
              </span>
            ),
          ])}
        />
      </Panel>
    </div>
  );
}
