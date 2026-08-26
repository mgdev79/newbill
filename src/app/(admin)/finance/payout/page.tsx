"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button, Field, PageHeader, Panel, StatCard, inputClass } from "@/components/ui";
import { formatDate, formatIdr } from "@/lib/utils";

type Row = { id: string; at: string; category: string; note: string; amount: number };
const empty = { at: new Date().toISOString().slice(0, 10), category: "operasional", note: "", amount: "" };

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState(empty);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await fetch("/api/v1/finance/payouts").then((r) => r.json());
    setRows(data.rows ?? []);
    setTotal(data.total ?? 0);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setBusy(true);
    setToast(null);
    const response = await fetch("/api/v1/finance/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        at: form.at,
        category: form.category,
        note: form.note,
        amount: Number(form.amount),
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

  async function remove(id: string) {
    if (!window.confirm("Hapus pengeluaran ini?")) return;
    await fetch(`/api/v1/finance/payouts/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Pengeluaran"
        description="Catatan payout operasional. Disimpan di database, bukan mock."
      />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
          {toast}
        </p>
      ) : null}
      <div className="mb-4">
        <StatCard tone="rose" label="Total pengeluaran" value={formatIdr(total)} />
      </div>
      <Panel title="Tambah pengeluaran">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Tanggal">
            <input type="date" className={inputClass} value={form.at} onChange={(e) => setForm({ ...form, at: e.target.value })} />
          </Field>
          <Field label="Kategori">
            <input className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </Field>
          <Field label="Catatan">
            <input className={inputClass} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
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
      <Panel className="mt-4" title="Daftar">
        <DataTable
          headers={["Tanggal", "Kategori", "Catatan", "Jumlah", ""]}
          rows={rows.map((row) => [
            formatDate(row.at),
            row.category,
            row.note,
            formatIdr(row.amount),
            <Button key={row.id} variant="ghost" onClick={() => void remove(row.id)}>
              Hapus
            </Button>,
          ])}
        />
      </Panel>
    </div>
  );
}
