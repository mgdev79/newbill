"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button, Field, PageHeader, Panel, StatusPill, inputClass } from "@/components/ui";
import { formatDate, formatIdr } from "@/lib/utils";

type Row = {
  id: string;
  ref: string;
  customer: string;
  amount: number;
  channel: string;
  status: string;
  provider: string;
  at: string;
};

const empty = {
  ref: "",
  customer: "",
  amount: "",
  channel: "QRIS",
  status: "pending",
};

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState(empty);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await fetch("/api/v1/payments?provider=duitku").then((r) => r.json());
    setRows(data.rows ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setBusy(true);
    setToast(null);
    const response = await fetch("/api/v1/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: Number(form.amount),
        provider: "duitku",
      }),
    });
    const data = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setToast(data.error ?? "Gagal menyimpan.");
      return;
    }
    setForm(empty);
    await load();
  }

  async function setStatus(id: string, status: string) {
    await fetch(`/api/v1/payments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Duitku"
        description="Ledger transaksi lokal. Konfigurasi Duitku tersimpan di Settings; panggilan API provider belum diaktifkan."
      />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
          {toast}
        </p>
      ) : null}
      <p className="mb-3 rounded-sm border border-[#faebcc] bg-[#fcf8e3] px-3 py-2 text-[13px] text-[#8a6d3b]">
        Provider tersimpan, panggilan API belum diaktifkan — perlu verifikasi endpoint resmi Duitku sebelum go-live.
      </p>
      <Panel title="Catat transaksi manual">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Referensi">
            <input className={inputClass} value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} />
          </Field>
          <Field label="Pelanggan">
            <input className={inputClass} value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
          </Field>
          <Field label="Channel">
            <input className={inputClass} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} />
          </Field>
          <Field label="Jumlah">
            <input className={inputClass} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
        </div>
        <div className="mt-3">
          <Button disabled={busy} onClick={() => void save()}>
            Simpan
          </Button>
        </div>
      </Panel>
      <Panel className="mt-4" title="Ledger">
        <DataTable
          headers={["Referensi", "Pelanggan", "Channel", "Jumlah", "Status", "Waktu", ""]}
          rows={rows.map((row) => [
            row.ref,
            row.customer,
            row.channel,
            formatIdr(row.amount),
            <StatusPill key={row.id} status={row.status} />,
            formatDate(row.at),
            row.status === "pending" ? (
              <Button key={`${row.id}-p`} variant="secondary" onClick={() => void setStatus(row.id, "paid")}>
                Tandai paid
              </Button>
            ) : (
              ""
            ),
          ])}
        />
      </Panel>
    </div>
  );
}
