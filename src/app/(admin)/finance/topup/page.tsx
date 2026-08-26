"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button, Field, PageHeader, Panel, StatusPill, inputClass } from "@/components/ui";
import { formatDate, formatIdr } from "@/lib/utils";

type Row = { id: string; at: string; reseller: string; amount: number; status: string };
const empty = { at: new Date().toISOString().slice(0, 10), reseller: "", amount: "", status: "paid" };

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState(empty);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await fetch("/api/v1/finance/topups").then((r) => r.json());
    setRows(data.rows ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setBusy(true);
    setToast(null);
    const response = await fetch("/api/v1/finance/topups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        at: form.at,
        reseller: form.reseller,
        amount: Number(form.amount),
        status: form.status,
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
    await fetch(`/api/v1/finance/topups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus topup ini?")) return;
    await fetch(`/api/v1/finance/topups/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Topup reseller"
        description="Saldo operator yang dicatat di database. Belum memotong/menambah StaffUser.balance otomatis."
      />
      {toast ? (
        <p className="mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
          {toast}
        </p>
      ) : null}
      <Panel title="Catat topup">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Tanggal">
            <input type="date" className={inputClass} value={form.at} onChange={(e) => setForm({ ...form, at: e.target.value })} />
          </Field>
          <Field label="Reseller">
            <input className={inputClass} value={form.reseller} onChange={(e) => setForm({ ...form, reseller: e.target.value })} />
          </Field>
          <Field label="Jumlah">
            <input className={inputClass} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="paid">paid</option>
              <option value="pending">pending</option>
            </select>
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
          headers={["Tanggal", "Reseller", "Jumlah", "Status", ""]}
          rows={rows.map((row) => [
            formatDate(row.at),
            row.reseller,
            formatIdr(row.amount),
            <StatusPill key={row.id} status={row.status} />,
            <span key={`${row.id}-a`} className="flex gap-2">
              {row.status === "pending" ? (
                <Button variant="secondary" onClick={() => void setStatus(row.id, "paid")}>
                  Tandai paid
                </Button>
              ) : null}
              <Button variant="ghost" onClick={() => void remove(row.id)}>
                Hapus
              </Button>
            </span>,
          ])}
        />
      </Panel>
    </div>
  );
}
